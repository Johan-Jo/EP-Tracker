import { createClient } from '@/lib/supabase/server';

export interface RefreshInvoiceBasisParams {
	orgId: string;
	projectId: string;
	periodStart: string; // YYYY-MM-DD
	periodEnd: string; // YYYY-MM-DD
}

export type InvoiceLineType = 'time' | 'material' | 'expense' | 'mileage' | 'ata' | 'diary';

export interface InvoiceBasisLine {
	id: string;
	type: InvoiceLineType;
	source: { table: string; id: string };
	article_code: string | null;
	description: string;
	unit: string | null;
	quantity: number;
	unit_price: number;
	discount: number;
	vat_rate: number;
	vat_code: string | null;
	account: string | null;
	dimensions: Record<string, string | null>;
	attachments: string[];
}

export interface DiarySummary {
	date: string;
	raw: string;
	summary: string;
	line_ref: string;
}

interface TotalsAccumulatorEntry {
	base: number;
	vat: number;
}

export interface InvoiceTotals {
	currency: string;
	total_ex_vat: number;
	total_vat: number;
	total_inc_vat: number;
	per_vat_rate: Record<string, { base: number; vat: number; total: number }>;
}

export const DEFAULT_CURRENCY = 'SEK';
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export const DEFAULT_LINE_CONFIG: Record<
	Exclude<InvoiceLineType, 'diary'>,
	{
		article: string | null;
		account: string | null;
		defaultVatRate: number;
		defaultVatCode: string | null;
		unit: string | null;
	}
> = {
	time: { article: 'TID-ARB', account: '3041', defaultVatRate: 25, defaultVatCode: '25', unit: 'h' },
	material: { article: 'MAT', account: '3051', defaultVatRate: 25, defaultVatCode: '25', unit: null },
	expense: { article: 'UTL', account: '5800', defaultVatRate: 25, defaultVatCode: '25', unit: 'st' },
	mileage: { article: 'MIL', account: '7331', defaultVatRate: 0, defaultVatCode: '0', unit: 'km' },
	ata: { article: 'ATA', account: '3048', defaultVatRate: 25, defaultVatCode: '25', unit: null },
};

export function roundCurrency(value: number): number {
	return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function sanitizeText(value: string | null | undefined): string {
	if (!value) return '';
	return value.replace(/[\r\n]+/g, ' ').replace(/;/g, ',').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength - 1).trim()}…`;
}

function buildDiarySummary(entry: any): { summary: string; raw: string } {
	const work = sanitizeText(entry.work_performed);
	const obstacles = sanitizeText(entry.obstacles);
	const deliveries = sanitizeText(entry.deliveries);
	const visitors = sanitizeText(entry.visitors);
	const weather = sanitizeText(entry.weather);
	const signature = sanitizeText(entry.signature_name);
	const crew =
		typeof entry.crew_count === 'number' && Number.isFinite(entry.crew_count) && entry.crew_count > 0
			? `Personalstyrka: ${entry.crew_count}`
			: '';
	const temperature =
		entry.temperature_c !== null && entry.temperature_c !== undefined
			? `Temperatur: ${entry.temperature_c}°C`
			: '';

	const parts: string[] = [];
	if (work) parts.push(`Arbete: ${work}`);
	if (obstacles) parts.push(`Hinder: ${obstacles}`);
	if (deliveries) parts.push(`Leveranser: ${deliveries}`);
	if (visitors) parts.push(`Besökare: ${visitors}`);
	if (crew) parts.push(crew);

	const weatherInfo = [weather, temperature].filter(Boolean).join(' ');
	if (weatherInfo) {
		parts.push(`Väder: ${weatherInfo}`);
	}
	if (signature) parts.push(`Signatur: ${signature}`);

	const summary = parts.length > 0 ? parts.join(' | ') : '';

	const rawParts = [entry.work_performed, entry.obstacles, entry.deliveries, entry.visitors, entry.safety_notes]
		.map((value: string | null) => sanitizeText(value))
		.filter(Boolean);
	const raw = truncate(rawParts.join(' ').trim(), 4000);

	if (summary) {
		return {
			summary: truncate(summary, 2000),
			raw,
		};
	}

	const fallback = truncate(raw || 'Dagboksanteckning', 500);
	return { summary: fallback, raw };
}

export function addTotalsEntry(
	accumulator: Map<number, TotalsAccumulatorEntry>,
	vatRate: number,
	lineAmountExVat: number
): void {
	if (!Number.isFinite(lineAmountExVat) || lineAmountExVat <= 0) {
		return;
	}
	const vatAmount = roundCurrency((lineAmountExVat * vatRate) / 100);
	const entry = accumulator.get(vatRate) || { base: 0, vat: 0 };
	entry.base = roundCurrency(entry.base + lineAmountExVat);
	entry.vat = roundCurrency(entry.vat + vatAmount);
	accumulator.set(vatRate, entry);
}

export function buildTotalsPayload(
	accumulator: Map<number, TotalsAccumulatorEntry>,
	currency: string
): InvoiceTotals {
	let totalExVat = 0;
	let totalVat = 0;
	const perVatRate: Record<string, { base: number; vat: number; total: number }> = {};

	accumulator.forEach((value, rate) => {
		const base = roundCurrency(value.base);
		const vat = roundCurrency(value.vat);
		const total = roundCurrency(base + vat);
		perVatRate[String(rate)] = { base, vat, total };
		totalExVat = roundCurrency(totalExVat + base);
		totalVat = roundCurrency(totalVat + vat);
	});

	return {
		currency,
		total_ex_vat: roundCurrency(totalExVat),
		total_vat: roundCurrency(totalVat),
		total_inc_vat: roundCurrency(totalExVat + totalVat),
		per_vat_rate: perVatRate,
	};
}

export function calculateTotalsFromLines(
	lines: InvoiceBasisLine[],
	currency = DEFAULT_CURRENCY
): InvoiceTotals {
	const accumulator = new Map<number, TotalsAccumulatorEntry>();
	lines.forEach((line) => {
		if (!line || line.type === 'diary') return;
		const quantity = Number(line.quantity) || 0;
		const unitPrice = Number(line.unit_price) || 0;
		const discount = Number(line.discount) || 0;
		if (quantity <= 0 || unitPrice < 0) return;
		const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
		const amountExVat = roundCurrency(quantity * unitPrice * discountFactor);
		const vatRate = Number(line.vat_rate) || 0;
		addTotalsEntry(accumulator, vatRate, amountExVat);
	});
	return buildTotalsPayload(accumulator, currency);
}

function ensureDateRange(start: string, end: string): { start: string; end: string } {
	const startDate = new Date(`${start}T00:00:00Z`);
	const endDate = new Date(`${end}T23:59:59.999Z`);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		throw new Error('Invalid period range');
	}
	if (endDate < startDate) {
		throw new Error('periodEnd must be on or after periodStart');
	}
	return {
		start: startDate.toISOString(),
		end: endDate.toISOString(),
	};
}

export async function refreshInvoiceBasis({
	orgId,
	projectId,
	periodStart,
	periodEnd,
}: RefreshInvoiceBasisParams) {
	const supabase = await createClient();

	const { start: rangeStart, end: rangeEnd } = ensureDateRange(periodStart, periodEnd);

	const [
		projectResult,
		timeResult,
		materialResult,
		expenseResult,
		mileageResult,
		ataResult,
		diaryResult,
	] = await Promise.all([
		supabase
			.from('projects')
			.select('id, org_id, name, project_number, site_address')
			.eq('id', projectId)
			.eq('org_id', orgId)
			.single(),
		supabase
			.from('time_entries')
			.select(
				'id, project_id, user_id, task_label, start_at, duration_min, status, phase:phases(name)'
			)
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.eq('status', 'approved')
			.gte('start_at', rangeStart)
			.lte('start_at', rangeEnd),
		supabase
			.from('materials')
			.select('id, project_id, description, qty, unit, unit_price_sek, total_sek, status, photo_url, created_at, ata_id')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.is('ata_id', null)
			.eq('status', 'approved')
			.gte('created_at', rangeStart)
			.lte('created_at', rangeEnd),
		supabase
			.from('expenses')
			.select('id, project_id, description, amount_sek, vat, status, category, photo_url, date, ata_id')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.is('ata_id', null)
			.eq('status', 'approved')
			.gte('date', periodStart)
			.lte('date', periodEnd),
		supabase
			.from('mileage')
			.select('id, project_id, date, km, rate_per_km_sek, total_sek, status')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.eq('status', 'approved')
			.gte('date', periodStart)
			.lte('date', periodEnd),
		supabase
			.from('ata')
			.select('id, project_id, ata_number, title, description, qty, unit, unit_price_sek, total_sek, fixed_amount_sek, materials_amount_sek, billing_type, status')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.eq('status', 'approved')
			.gte('created_at', rangeStart)
			.lte('created_at', rangeEnd),
		supabase
			.from('diary_entries')
			.select(
				'id, project_id, date, work_performed, obstacles, deliveries, visitors, crew_count, weather, temperature_c, signature_name, safety_notes'
			)
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.gte('date', periodStart)
			.lte('date', periodEnd),
	]);

	if (projectResult.error || !projectResult.data) {
		throw new Error('Project not found or not accessible');
	}

	const project = projectResult.data;
	const projectDimension = project.project_number ?? project.id;
	const worksiteAddress = project.site_address
		? { address: project.site_address, project_name: project.name }
		: null;

	const lines: InvoiceBasisLine[] = [];
	const diarySummaries: DiarySummary[] = [];
	const totalsAccumulator = new Map<number, TotalsAccumulatorEntry>();

	// Helper to push lines and update totals
	const pushLine = (line: InvoiceBasisLine, amountExVat: number) => {
		lines.push(line);
		addTotalsEntry(totalsAccumulator, line.vat_rate, roundCurrency(amountExVat));
	};

	// TIME ENTRIES
	const timeEntries = timeResult.data ?? [];
	const timeUserIds = Array.from(new Set(timeEntries.map((entry: any) => entry.user_id)));
	const membershipRates = new Map<string, number>();

	if (timeUserIds.length > 0) {
		const { data: membershipRows } = await supabase
			.from('memberships')
			.select('user_id, hourly_rate_sek')
			.eq('org_id', orgId)
			.in('user_id', timeUserIds);

		(membershipRows ?? []).forEach((row: any) => {
			if (row.user_id) {
				membershipRates.set(row.user_id, Number(row.hourly_rate_sek) || 0);
			}
		});
	}

	timeEntries.forEach((entry: any) => {
		if (!entry || !entry.id) return;
		const hours = entry.duration_min ? Number(entry.duration_min) / 60 : 0;
		if (!Number.isFinite(hours) || hours <= 0) {
			return;
		}

		const hourlyRate = membershipRates.get(entry.user_id) ?? 0;
		const config = DEFAULT_LINE_CONFIG.time;
		const description =
			sanitizeText(entry.task_label) ||
			`Arbete ${new Date(entry.start_at).toLocaleDateString('sv-SE')}${
				entry.phase?.name ? ` (${entry.phase.name})` : ''
			}`;

		const amountExVat = roundCurrency(hours * hourlyRate);

		pushLine(
			{
				id: entry.id,
				type: 'time',
				source: { table: 'time_entries', id: entry.id },
				article_code: config.article,
				description: truncate(description, 512),
				unit: config.unit,
				quantity: roundCurrency(hours),
				unit_price: roundCurrency(hourlyRate),
				discount: 0,
				vat_rate: config.defaultVatRate,
				vat_code: config.defaultVatCode,
				account: config.account,
				dimensions: { project: projectDimension, cost_center: null },
				attachments: [],
			},
			amountExVat
		);
	});

	// MATERIALS
	(materialResult.data ?? []).forEach((material: any) => {
		if (!material || !material.id) return;
		const qty = Number(material.qty) || 0;
		const unitPrice = Number(material.unit_price_sek) || 0;
		const config = DEFAULT_LINE_CONFIG.material;
		const amountExVat = roundCurrency(qty * unitPrice);

		pushLine(
			{
				id: material.id,
				type: 'material',
				source: { table: 'materials', id: material.id },
				article_code: config.article,
				description: truncate(sanitizeText(material.description), 512),
				unit: material.unit ?? config.unit,
				quantity: roundCurrency(qty),
				unit_price: roundCurrency(unitPrice),
				discount: 0,
				vat_rate: config.defaultVatRate,
				vat_code: config.defaultVatCode,
				account: config.account,
				dimensions: { project: projectDimension, cost_center: null },
				attachments: material.photo_url ? [material.photo_url] : [],
			},
			amountExVat
		);
	});

	// EXPENSES
	(expenseResult.data ?? []).forEach((expense: any) => {
		if (!expense || !expense.id) return;
		const amount = Number(expense.amount_sek) || 0;
		const hasVat = expense.vat === null ? true : Boolean(expense.vat);
		const config = DEFAULT_LINE_CONFIG.expense;
		const vatRate = hasVat ? config.defaultVatRate : 0;
		const vatCode = hasVat ? config.defaultVatCode : '0';
		const amountExVat = roundCurrency(amount);

		pushLine(
			{
				id: expense.id,
				type: 'expense',
				source: { table: 'expenses', id: expense.id },
				article_code: config.article,
				description: truncate(sanitizeText(expense.description), 512),
				unit: config.unit,
				quantity: 1,
				unit_price: roundCurrency(amount),
				discount: 0,
				vat_rate: vatRate,
				vat_code: vatCode,
				account: config.account,
				dimensions: { project: projectDimension, cost_center: null },
				attachments: expense.photo_url ? [expense.photo_url] : [],
			},
			amountExVat
		);
	});

	// MILEAGE
	(mileageResult.data ?? []).forEach((entry: any) => {
		if (!entry || !entry.id) return;
		const km = Number(entry.km) || 0;
		const rate = Number(entry.rate_per_km_sek) || 0;
		const config = DEFAULT_LINE_CONFIG.mileage;
		const amountExVat = roundCurrency(km * rate);

		pushLine(
			{
				id: entry.id,
				type: 'mileage',
				source: { table: 'mileage', id: entry.id },
				article_code: config.article,
				description: `Milersättning ${new Date(entry.date).toLocaleDateString('sv-SE')}`,
				unit: config.unit,
				quantity: roundCurrency(km),
				unit_price: roundCurrency(rate),
				discount: 0,
				vat_rate: config.defaultVatRate,
				vat_code: config.defaultVatCode,
				account: config.account,
				dimensions: { project: projectDimension, cost_center: null },
				attachments: [],
			},
			amountExVat
		);
	});

	// ÄTA
	(ataResult.data ?? []).forEach((entry: any) => {
		if (!entry || !entry.id) return;
		const qty = Number(entry.qty) || 0;
		const unitPrice = Number(entry.unit_price_sek) || 0;
		const fixedAmount = Number(entry.fixed_amount_sek) || 0;
		const materialsAmountRaw = Number(entry.materials_amount_sek) || 0;
		const billingType = entry.billing_type ?? 'LOPANDE';
		const config = DEFAULT_LINE_CONFIG.ata;
		const laborAmountRaw =
			billingType === 'FAST'
				? fixedAmount
				: qty * unitPrice;
		const laborAmount = roundCurrency(Number.isFinite(laborAmountRaw) ? laborAmountRaw : 0);
		const materialsAmount = roundCurrency(Number.isFinite(materialsAmountRaw) ? materialsAmountRaw : 0);

		const descriptionParts = [
			sanitizeText(entry.title),
			sanitizeText(entry.description),
			entry.ata_number ? `ÄTA ${entry.ata_number}` : null,
		].filter(Boolean);

		if (laborAmount > 0) {
			const quantityValue = billingType === 'FAST' ? 1 : roundCurrency(qty);
			const unitValue =
				billingType === 'FAST'
					? 'st'
					: entry.unit ?? config.unit;
			const unitPriceValue =
				billingType === 'FAST'
					? laborAmount
					: roundCurrency(unitPrice);

			pushLine(
				{
					id: entry.id,
					type: 'ata',
					source: { table: 'ata', id: entry.id },
					article_code: config.article,
					description: truncate(descriptionParts.join(' – '), 512),
					unit: unitValue,
					quantity: quantityValue,
					unit_price: unitPriceValue,
					discount: 0,
					vat_rate: config.defaultVatRate,
					vat_code: config.defaultVatCode,
					account: config.account,
					dimensions: { project: projectDimension, cost_center: null },
					attachments: [],
				},
				laborAmount
			);
		}

		if (materialsAmount > 0) {
			const materialConfig = DEFAULT_LINE_CONFIG.material;
			const materialDescription = descriptionParts.length
				? `Material – ${truncate(descriptionParts.join(' – '), 400)}`
				: 'Materialkostnad';

			pushLine(
				{
					id: `${entry.id}-material`,
					type: 'material',
					source: { table: 'ata', id: entry.id },
					article_code: materialConfig.article,
					description: truncate(materialDescription, 512),
					unit: materialConfig.unit ?? 'st',
					quantity: 1,
					unit_price: roundCurrency(materialsAmount),
					discount: 0,
					vat_rate: materialConfig.defaultVatRate,
					vat_code: materialConfig.defaultVatCode,
					account: materialConfig.account,
					dimensions: { project: projectDimension, cost_center: null },
					attachments: [],
				},
				materialsAmount
			);
		}
	});

	// DIARY
	(diaryResult.data ?? [])
		.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
		.forEach((entry: any) => {
			if (!entry || !entry.id) return;
			const lineId = entry.id;
			const { summary, raw } = buildDiarySummary(entry);
			const description = summary || `Dagbok ${entry.date}`;

			const diaryLine: InvoiceBasisLine = {
				id: lineId,
				type: 'diary',
				source: { table: 'diary_entries', id: entry.id },
				article_code: null,
				description: truncate(description, 1024),
				unit: null,
				quantity: 0,
				unit_price: 0,
				discount: 0,
				vat_rate: 0,
				vat_code: '0',
				account: null,
				dimensions: { project: projectDimension, cost_center: null },
				attachments: [],
			};

			lines.push(diaryLine);
			diarySummaries.push({
				date: entry.date,
				raw,
				summary: diaryLine.description,
				line_ref: lineId,
			});
		});

	const totalsPayload = buildTotalsPayload(totalsAccumulator, DEFAULT_CURRENCY);

	const payload = {
		org_id: orgId,
		project_id: projectId,
		period_start: periodStart,
		period_end: periodEnd,
		customer_id: null,
		invoice_series: null,
		invoice_number: null,
		invoice_date: null,
		due_date: null,
		payment_terms_days: DEFAULT_PAYMENT_TERMS_DAYS,
		ocr_ref: null,
		currency: DEFAULT_CURRENCY,
		fx_rate: 1,
		our_ref: null,
		your_ref: null,
		reverse_charge_building: false,
		rot_rut_flag: false,
		worksite_address_json: worksiteAddress,
		worksite_id: null,
		invoice_address_json: null,
		delivery_address_json: null,
		cost_center: null,
		result_unit: null,
		lines_json: {
			lines,
			diary: diarySummaries,
		},
		totals: totalsPayload,
	};

	const { data: existingRecord, error: fetchError } = await supabase
		.from('invoice_basis')
		.select('id, locked')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.eq('period_start', periodStart)
		.eq('period_end', periodEnd)
		.maybeSingle();

	if (fetchError) {
		throw new Error(`Failed to read invoice_basis: ${fetchError.message}`);
	}

	if (existingRecord?.locked) {
		// Locked records must not be overwritten; return the existing snapshot.
		const { data: lockedRecord, error: lockedError } = await supabase
			.from('invoice_basis')
			.select('*')
			.eq('id', existingRecord.id)
			.single();
		if (lockedError) {
			throw new Error(`Failed to load locked invoice_basis record: ${lockedError.message}`);
		}
		return lockedRecord;
	}

	if (existingRecord) {
		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update({
				...payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', existingRecord.id);
		if (updateError) {
			throw new Error(`Failed to update invoice_basis: ${updateError.message}`);
		}
	} else {
		const { error: insertError } = await supabase.from('invoice_basis').insert(payload);
		if (insertError) {
			throw new Error(`Failed to insert invoice_basis: ${insertError.message}`);
		}
	}

	const { data: refreshedRecord, error: finalFetchError } = await supabase
		.from('invoice_basis')
		.select('*')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.eq('period_start', periodStart)
		.eq('period_end', periodEnd)
		.single();

	if (finalFetchError) {
		throw new Error(`Failed to load invoice_basis: ${finalFetchError.message}`);
	}

	return refreshedRecord;
}


