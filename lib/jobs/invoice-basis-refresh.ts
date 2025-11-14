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
	ata_info?: { title: string; ata_number: string | null } | null;
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
			.select('id, org_id, name, project_number, site_address, customer_id')
			.eq('id', projectId)
			.eq('org_id', orgId)
			.single(),
		supabase
			.from('time_entries')
			.select(
				'id, project_id, user_id, task_label, start_at, duration_min, status, employee_id, subcontractor_id, phase:phases(name)'
			)
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.eq('status', 'approved')
			.gte('start_at', rangeStart)
			.lte('start_at', rangeEnd),
		supabase
			.from('materials')
			.select('id, project_id, description, qty, unit, unit_price_sek, total_sek, status, photo_urls, created_at, approved_at, ata_id')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.is('ata_id', null)
			.eq('status', 'approved'),
			// Include ALL approved materials for the project - date filtering removed to ensure nothing is missed
		supabase
			.from('expenses')
			.select('id, project_id, description, amount_sek, vat, status, category, photo_urls, date, approved_at, ata_id')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.is('ata_id', null)
			.eq('status', 'approved'),
			// Include ALL approved expenses for the project - date filtering removed to ensure nothing is missed
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
			.select('id, project_id, ata_number, title, description, qty, unit, unit_price_sek, total_sek, fixed_amount_sek, materials_amount_sek, billing_type, status, created_at, approved_at')
			.eq('org_id', orgId)
			.eq('project_id', projectId)
			.eq('status', 'approved'),
			// Include ALL approved ÄTA for the project - date filtering removed to ensure nothing is missed
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

	// Debug logging - check query results
	console.log(`[refreshInvoiceBasis] Filtering for period ${periodStart} to ${periodEnd}`);
	console.log(`[refreshInvoiceBasis] Project ID: ${projectId}, Org ID: ${orgId}`);
	
	// Check for errors first
	if (materialResult.error) {
		console.error('[refreshInvoiceBasis] Materials query error:', materialResult.error);
	} else {
		console.log(`[refreshInvoiceBasis] Materials query result: ${materialResult.data?.length || 0} found`);
	}
	if (expenseResult.error) {
		console.error('[refreshInvoiceBasis] Expenses query error:', expenseResult.error);
	} else {
		console.log(`[refreshInvoiceBasis] Expenses query result: ${expenseResult.data?.length || 0} found`);
	}
	if (ataResult.error) {
		console.error('[refreshInvoiceBasis] ÄTA query error:', ataResult.error);
	} else {
		console.log(`[refreshInvoiceBasis] ÄTA query result: ${ataResult.data?.length || 0} found`);
	}

	// Debug: Check if there are ANY materials, expenses, or ÄTA for this project (regardless of status)
	const { data: allMaterials } = await supabase
		.from('materials')
		.select('id, status, ata_id, project_id')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.limit(10);
	
	const { data: allExpenses } = await supabase
		.from('expenses')
		.select('id, status, ata_id, project_id')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.limit(10);
	
	const { data: allAtas } = await supabase
		.from('ata')
		.select('id, status, project_id')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.limit(10);

	console.log(`[refreshInvoiceBasis] DEBUG - All materials for project (any status): ${allMaterials?.length || 0}`);
	if (allMaterials && allMaterials.length > 0) {
		const statusCounts = allMaterials.reduce((acc: Record<string, number>, m: any) => {
			acc[m.status] = (acc[m.status] || 0) + 1;
			return acc;
		}, {});
		const withAtaId = allMaterials.filter((m: any) => m.ata_id !== null).length;
		console.log(`[refreshInvoiceBasis] DEBUG - Materials by status:`, statusCounts, `with ata_id: ${withAtaId}`);
	}

	console.log(`[refreshInvoiceBasis] DEBUG - All expenses for project (any status): ${allExpenses?.length || 0}`);
	if (allExpenses && allExpenses.length > 0) {
		const statusCounts = allExpenses.reduce((acc: Record<string, number>, e: any) => {
			acc[e.status] = (acc[e.status] || 0) + 1;
			return acc;
		}, {});
		const withAtaId = allExpenses.filter((e: any) => e.ata_id !== null).length;
		console.log(`[refreshInvoiceBasis] DEBUG - Expenses by status:`, statusCounts, `with ata_id: ${withAtaId}`);
	}

	console.log(`[refreshInvoiceBasis] DEBUG - All ÄTA for project (any status): ${allAtas?.length || 0}`);
	if (allAtas && allAtas.length > 0) {
		const statusCounts = allAtas.reduce((acc: Record<string, number>, a: any) => {
			acc[a.status] = (acc[a.status] || 0) + 1;
			return acc;
		}, {});
		console.log(`[refreshInvoiceBasis] DEBUG - ÄTA by status:`, statusCounts);
	}
	
	// Log sample data to see what we're getting
	if (materialResult.data && materialResult.data.length > 0) {
		console.log(`[refreshInvoiceBasis] Sample material:`, {
			id: materialResult.data[0].id,
			project_id: materialResult.data[0].project_id,
			status: materialResult.data[0].status,
			ata_id: materialResult.data[0].ata_id,
			created_at: materialResult.data[0].created_at,
			approved_at: materialResult.data[0].approved_at,
		});
	}
	if (expenseResult.data && expenseResult.data.length > 0) {
		console.log(`[refreshInvoiceBasis] Sample expense:`, {
			id: expenseResult.data[0].id,
			project_id: expenseResult.data[0].project_id,
			status: expenseResult.data[0].status,
			ata_id: expenseResult.data[0].ata_id,
			date: expenseResult.data[0].date,
			approved_at: expenseResult.data[0].approved_at,
		});
	}
	if (ataResult.data && ataResult.data.length > 0) {
		console.log(`[refreshInvoiceBasis] Sample ÄTA:`, {
			id: ataResult.data[0].id,
			project_id: ataResult.data[0].project_id,
			status: ataResult.data[0].status,
			created_at: ataResult.data[0].created_at,
			approved_at: ataResult.data[0].approved_at,
		});
	}

	// For now, include ALL approved materials, expenses, and ÄTA for the project
	// The date filtering in the query should handle this, but if it doesn't, we include everything
	// This ensures nothing is missed
	const filteredMaterials = materialResult.data ?? [];
	const filteredExpenses = expenseResult.data ?? [];
	const filteredAtas = ataResult.data ?? [];

	console.log(`[refreshInvoiceBasis] Using all approved items: ${filteredMaterials.length} materials, ${filteredExpenses.length} expenses, ${filteredAtas.length} ÄTA`);

	// Fetch customer information if customer_id exists
	let customer = null;
	let invoiceAddress = null;
	let deliveryAddress = null;
	let customerSnapshot = null;
	let defaultPaymentTerms = DEFAULT_PAYMENT_TERMS_DAYS;

	if (project.customer_id) {
		const { data: customerData, error: customerError } = await supabase
			.from('customers')
			.select('*')
			.eq('id', project.customer_id)
			.eq('org_id', orgId)
			.single();

		if (customerError) {
			console.warn(`[invoice-basis-refresh] Failed to fetch customer ${project.customer_id}:`, customerError.message);
		} else if (customerData) {
			customer = customerData;

			// Build invoice address
			if (customer.invoice_address_street) {
				invoiceAddress = {
					street: customer.invoice_address_street,
					zip: customer.invoice_address_zip || null,
					city: customer.invoice_address_city || null,
					country: customer.invoice_address_country || 'Sverige',
					name: customer.type === 'COMPANY' 
						? customer.company_name 
						: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null,
					org_no: customer.type === 'COMPANY' ? customer.org_no : customer.personal_identity_no,
					email: customer.invoice_email || null,
					phone: customer.phone_mobile || null,
				};
			}

			// Build delivery address
			if (customer.delivery_address_street) {
				deliveryAddress = {
					street: customer.delivery_address_street,
					zip: customer.delivery_address_zip || null,
					city: customer.delivery_address_city || null,
					country: customer.delivery_address_country || 'Sverige',
				};
			}

			// Create customer snapshot for audit trail
			customerSnapshot = {
				customer_id: customer.id,
				customer_no: customer.customer_no,
				type: customer.type,
				name: customer.type === 'COMPANY' 
					? customer.company_name 
					: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
				org_no: customer.type === 'COMPANY' ? customer.org_no : customer.personal_identity_no,
				vat_no: customer.vat_no,
				invoice_email: customer.invoice_email,
				invoice_method: customer.invoice_method,
				terms: customer.terms,
				default_vat_rate: customer.default_vat_rate,
				bankgiro: customer.bankgiro,
				plusgiro: customer.plusgiro,
				reference: customer.reference,
				invoice_address: invoiceAddress,
				delivery_address: deliveryAddress,
				snapshot_date: new Date().toISOString(),
			};

			// Use customer's payment terms if available
			if (customer.terms !== null && customer.terms !== undefined) {
				defaultPaymentTerms = customer.terms;
			}

			console.log(`[invoice-basis-refresh] Loaded customer data:`, {
				name: customer.type === 'COMPANY' ? customer.company_name : `${customer.first_name} ${customer.last_name}`,
				terms: customer.terms,
				reference: customer.reference,
				rot_enabled: customer.rot_enabled,
				has_invoice_address: !!invoiceAddress,
				has_delivery_address: !!deliveryAddress,
			});
		} else {
			console.warn(`[invoice-basis-refresh] Customer ${project.customer_id} not found or not accessible`);
		}
	} else {
		console.log(`[invoice-basis-refresh] Project ${projectId} has no customer_id`);
	}

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
	
	// Collect employee and subcontractor IDs
	const employeeIds = Array.from(new Set(timeEntries.map((entry: any) => entry.employee_id).filter(Boolean)));
	const subcontractorIds = Array.from(new Set(timeEntries.map((entry: any) => entry.subcontractor_id).filter(Boolean)));
	const timeUserIds = Array.from(new Set(timeEntries.map((entry: any) => entry.user_id)));
	
	const employeeRates = new Map<string, number>();
	const subcontractorRates = new Map<string, number>();
	const membershipRates = new Map<string, number>();

	// Fetch hourly rates from employees
	if (employeeIds.length > 0) {
		const { data: employeeRows } = await supabase
			.from('employees')
			.select('id, hourly_rate_sek')
			.eq('org_id', orgId)
			.in('id', employeeIds);

		(employeeRows ?? []).forEach((row: any) => {
			if (row.id) {
				employeeRates.set(row.id, Number(row.hourly_rate_sek) || 0);
			}
		});
	}

	// Fetch hourly rates from subcontractors
	if (subcontractorIds.length > 0) {
		const { data: subcontractorRows } = await supabase
			.from('subcontractors')
			.select('id, hourly_rate_sek')
			.eq('org_id', orgId)
			.in('id', subcontractorIds);

		(subcontractorRows ?? []).forEach((row: any) => {
			if (row.id) {
				subcontractorRates.set(row.id, Number(row.hourly_rate_sek) || 0);
			}
		});
	}

	// Fallback: Fetch hourly rates from memberships (for time entries not linked to employees/subcontractors)
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

		// Priority: employee rate > subcontractor rate > membership rate
		let hourlyRate = 0;
		if (entry.employee_id) {
			hourlyRate = employeeRates.get(entry.employee_id) ?? 0;
		} else if (entry.subcontractor_id) {
			hourlyRate = subcontractorRates.get(entry.subcontractor_id) ?? 0;
		} else {
			hourlyRate = membershipRates.get(entry.user_id) ?? 0;
		}
		
		// Include time entries even if hourly rate is 0 (user can set rate manually in UI)
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
	console.log(`[refreshInvoiceBasis] Processing ${filteredMaterials.length} filtered materials`);
	let materialsAdded = 0;
	filteredMaterials.forEach((material: any) => {
		if (!material || !material.id) {
			console.warn(`[refreshInvoiceBasis] Skipping material - missing id:`, material);
			return;
		}
		const qty = Number(material.qty) || 0;
		const unitPrice = Number(material.unit_price_sek) || 0;
		const config = DEFAULT_LINE_CONFIG.material;
		const amountExVat = roundCurrency(qty * unitPrice);

		console.log(`[refreshInvoiceBasis] Adding material ${material.id}: qty=${qty}, unitPrice=${unitPrice}, amount=${amountExVat}`);
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
				attachments: material.photo_urls && Array.isArray(material.photo_urls) ? material.photo_urls : (material.photo_urls ? [material.photo_urls] : []),
			},
			amountExVat
		);
		materialsAdded++;
	});
	console.log(`[refreshInvoiceBasis] Added ${materialsAdded} material lines. Total lines so far: ${lines.length}`);

	// EXPENSES
	console.log(`[refreshInvoiceBasis] Processing ${filteredExpenses.length} filtered expenses`);
	let expensesAdded = 0;
	filteredExpenses.forEach((expense: any) => {
		if (!expense || !expense.id) {
			console.warn(`[refreshInvoiceBasis] Skipping expense - missing id:`, expense);
			return;
		}
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
				attachments: expense.photo_urls && Array.isArray(expense.photo_urls) ? expense.photo_urls : (expense.photo_urls ? [expense.photo_urls] : []),
			},
			amountExVat
		);
		expensesAdded++;
	});
	console.log(`[refreshInvoiceBasis] Added ${expensesAdded} expense lines. Total lines so far: ${lines.length}`);

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
	console.log(`[refreshInvoiceBasis] Processing ${filteredAtas.length} filtered ÄTA`);
	let atasAdded = 0;
	filteredAtas.forEach((entry: any) => {
		if (!entry || !entry.id) {
			console.warn(`[refreshInvoiceBasis] Skipping ÄTA - missing id:`, entry);
			return;
		}
		const qty = Number(entry.qty) || 0;
		const unitPrice = Number(entry.unit_price_sek) || 0;
		const fixedAmount = Number(entry.fixed_amount_sek) || 0;
		const materialsAmountRaw = Number(entry.materials_amount_sek) || 0;
		const totalSek = Number(entry.total_sek) || 0;
		const billingType = entry.billing_type ?? 'LOPANDE';
		const config = DEFAULT_LINE_CONFIG.ata;
		const laborAmountRaw =
			billingType === 'FAST'
				? fixedAmount
				: qty * unitPrice;
		const laborAmount = roundCurrency(Number.isFinite(laborAmountRaw) ? laborAmountRaw : 0);
		const materialsAmount = roundCurrency(Number.isFinite(materialsAmountRaw) ? materialsAmountRaw : 0);

		console.log(`[refreshInvoiceBasis] ÄTA ${entry.id}: qty=${qty}, unitPrice=${unitPrice}, fixedAmount=${fixedAmount}, laborAmount=${laborAmount}, materialsAmount=${materialsAmount}, billingType=${billingType}`);

		// Prepare ÄTA info for all lines from this ÄTA
		const ataInfo = {
			title: sanitizeText(entry.title) || 'ÄTA',
			ata_number: entry.ata_number || null,
		};

		// Add ÄTA description to diary summaries if it has a description
		if (entry.description && sanitizeText(entry.description)) {
			const ataDate = entry.approved_at || entry.created_at;
			const ataDateStr = ataDate ? new Date(ataDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
			const ataLabel = entry.ata_number ? `ÄTA ${entry.ata_number}` : entry.title || 'ÄTA';
			const ataDescription = sanitizeText(entry.description);
			const ataSummary = `${ataLabel}: ${ataDescription}`;
			
			diarySummaries.push({
				date: ataDateStr,
				raw: truncate(ataDescription, 4000),
				summary: truncate(ataSummary, 2000),
				line_ref: `ata-${entry.id}`,
			});
		}

		// For line descriptions, exclude the full description since it's shown in diary section
		// Only include title and ata_number
		const lineDescriptionParts = [
			sanitizeText(entry.title),
			entry.ata_number ? `ÄTA ${entry.ata_number}` : null,
		].filter(Boolean);

		// If we have labor amount, add it as a line
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

			console.log(`[refreshInvoiceBasis] Adding ÄTA labor line for ${entry.id}: type=ata, amount=${laborAmount}`);
			pushLine(
				{
					id: entry.id,
					type: 'ata',
					source: { table: 'ata', id: entry.id },
					article_code: config.article,
					description: truncate(lineDescriptionParts.join(' – ') || 'ÄTA', 512),
					unit: unitValue,
					quantity: quantityValue,
					unit_price: unitPriceValue,
					discount: 0,
					vat_rate: config.defaultVatRate,
					vat_code: config.defaultVatCode,
					account: config.account,
					dimensions: { project: projectDimension, cost_center: null },
					attachments: [],
					ata_info: ataInfo,
				},
				laborAmount
			);
			atasAdded++;
		} else {
			console.log(`[refreshInvoiceBasis] Skipping ÄTA labor line for ${entry.id}: laborAmount=${laborAmount} (qty=${qty}, unitPrice=${unitPrice}, fixedAmount=${fixedAmount}, billingType=${billingType})`);
		}

		// If we have materials amount, add it as a separate material line
		if (materialsAmount > 0) {
			const materialConfig = DEFAULT_LINE_CONFIG.material;
			const materialDescription = lineDescriptionParts.length
				? `Material – ${truncate(lineDescriptionParts.join(' – '), 400)}`
				: 'Materialkostnad';

			console.log(`[refreshInvoiceBasis] Adding ÄTA material line for ${entry.id}: type=material, amount=${materialsAmount}`);
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
					ata_info: ataInfo,
				},
				materialsAmount
			);
			atasAdded++;
		} else {
			console.log(`[refreshInvoiceBasis] Skipping ÄTA material line for ${entry.id}: materialsAmount=${materialsAmount}`);
		}

		// Fallback: If total_sek exists but laborAmount and materialsAmount are both 0 or missing,
		// add the ÄTA as a single line using total_sek
		if (totalSek > 0 && laborAmount === 0 && materialsAmount === 0) {
			pushLine(
				{
					id: entry.id,
					type: 'ata',
					source: { table: 'ata', id: entry.id },
					article_code: config.article,
					description: truncate(lineDescriptionParts.join(' – ') || 'ÄTA', 512),
					unit: 'st',
					quantity: 1,
					unit_price: roundCurrency(totalSek),
					discount: 0,
					vat_rate: config.defaultVatRate,
					vat_code: config.defaultVatCode,
					account: config.account,
					dimensions: { project: projectDimension, cost_center: null },
					attachments: [],
					ata_info: ataInfo,
				},
				roundCurrency(totalSek)
			);
			atasAdded++;
		}
	});
	console.log(`[refreshInvoiceBasis] Added ${atasAdded} ÄTA lines. Total lines so far: ${lines.length}`);

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

	console.log(`[refreshInvoiceBasis] Final summary: ${lines.length} total lines (${materialsAdded} materials, ${expensesAdded} expenses, ${atasAdded} ÄTA)`);
	
	// Sort diary summaries by date (including ÄTA descriptions)
	diarySummaries.sort((a, b) => {
		const dateA = new Date(a.date).getTime();
		const dateB = new Date(b.date).getTime();
		return dateA - dateB;
	});
	
	const totalsPayload = buildTotalsPayload(totalsAccumulator, DEFAULT_CURRENCY);

	const payload = {
		org_id: orgId,
		project_id: projectId,
		period_start: periodStart,
		period_end: periodEnd,
		customer_id: project.customer_id ?? null,
		invoice_series: null,
		invoice_number: null,
		invoice_date: null,
		due_date: null,
		payment_terms_days: defaultPaymentTerms,
		ocr_ref: null,
		currency: DEFAULT_CURRENCY,
		fx_rate: 1,
		our_ref: null,
		your_ref: customer?.reference || null,
		reverse_charge_building: false,
		rot_rut_flag: customer?.rot_enabled || false,
		worksite_address_json: worksiteAddress,
		worksite_id: null,
		invoice_address_json: invoiceAddress,
		delivery_address_json: deliveryAddress,
		cost_center: null,
		result_unit: null,
		lines_json: {
			lines,
			diary: diarySummaries,
		},
		totals: totalsPayload,
		customer_snapshot: customerSnapshot,
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
		// Log a warning if we're trying to refresh a locked record (e.g., from auto-refresh after approval)
		console.warn(
			`[refreshInvoiceBasis] Attempted to refresh locked invoice_basis for project ${projectId}, period ${periodStart}-${periodEnd}. Returning existing locked record.`
		);
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
		console.log(`[refreshInvoiceBasis] Updating existing invoice_basis record ${existingRecord.id} with ${lines.length} lines`);
		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update({
				...payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', existingRecord.id);
		if (updateError) {
			console.error(`[refreshInvoiceBasis] Update error:`, updateError);
			throw new Error(`Failed to update invoice_basis: ${updateError.message}`);
		}
		console.log(`[refreshInvoiceBasis] Successfully updated invoice_basis record`);
	} else {
		console.log(`[refreshInvoiceBasis] Creating new invoice_basis record with ${lines.length} lines`);
		const { error: insertError } = await supabase.from('invoice_basis').insert(payload);
		if (insertError) {
			console.error(`[refreshInvoiceBasis] Insert error:`, insertError);
			throw new Error(`Failed to insert invoice_basis: ${insertError.message}`);
		}
		console.log(`[refreshInvoiceBasis] Successfully created invoice_basis record`);
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

	// Debug: Log what was actually saved
	const savedLines = refreshedRecord?.lines_json?.lines ?? [];
	const savedLineTypes = savedLines.reduce((acc: Record<string, number>, line: any) => {
		acc[line.type] = (acc[line.type] || 0) + 1;
		return acc;
	}, {});
	console.log(`[refreshInvoiceBasis] Saved invoice_basis has ${savedLines.length} lines:`, savedLineTypes);

	return refreshedRecord;
}


