import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { calculateTotalsFromLines, InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';
import { generateOcrMod10 } from '@/lib/utils/ocr';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function assertAdmin(role: string) {
	if (role !== 'admin') {
		throw Object.assign(new Error('Forbidden'), { status: 403 });
	}
}

function parseDate(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null as any;
	if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
		throw Object.assign(new Error(`${field} must be formatted as YYYY-MM-DD`), { status: 400 });
	}
	return value;
}

function parseBoolean(value: unknown, field: string): boolean | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'boolean') {
		throw Object.assign(new Error(`${field} must be boolean`), { status: 400 });
	}
	return value;
}

function parseString(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null as any;
	if (typeof value !== 'string') {
		throw Object.assign(new Error(`${field} must be a string`), { status: 400 });
	}
	return value;
}

function parseNumber(value: unknown, field: string, { min }: { min?: number } = {}): number | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null as any;
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
		throw Object.assign(new Error(`${field} must be a number`), { status: 400 });
	}
	if (min !== undefined && value < min) {
		throw Object.assign(new Error(`${field} must be >= ${min}`), { status: 400 });
	}
	return value;
}

function generateDefaultInvoiceNumber(series: string | null): string {
	const today = new Date();
	const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
		today.getDate()
	).padStart(2, '0')}-${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
	return `${series ?? 'A'}-${stamp}`;
}

function createHashSignature(payload: unknown): string {
	const hash = createHash('sha256');
	hash.update(JSON.stringify(payload));
	return hash.digest('hex');
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
	try {
		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		assertAdmin(membership.role);

		const projectId = params.projectId;
		if (!projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
		}

		const periodStart = body.periodStart || body.period_start;
		const periodEnd = body.periodEnd || body.period_end;

		if (!periodStart || !periodEnd) {
			return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 });
		}

		if (!DATE_REGEX.test(periodStart) || !DATE_REGEX.test(periodEnd)) {
			return NextResponse.json({ error: 'periodStart and periodEnd must be YYYY-MM-DD' }, { status: 400 });
		}

		if (periodStart > periodEnd) {
			return NextResponse.json({ error: 'periodEnd must be on or after periodStart' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: basis, error: fetchError } = await supabase
			.from('invoice_basis')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('project_id', projectId)
			.eq('period_start', periodStart)
			.eq('period_end', periodEnd)
			.single();

		if (fetchError || !basis) {
			return NextResponse.json({ error: 'Invoice basis not found for period' }, { status: 404 });
		}

		if (basis.locked) {
			return NextResponse.json({ error: 'Invoice basis already locked' }, { status: 409 });
		}

		const invoiceSeries = parseString(body.invoiceSeries ?? body.invoice_series, 'invoice_series') ?? basis.invoice_series;
		const invoiceNumber =
			parseString(body.invoiceNumber ?? body.invoice_number, 'invoice_number') ??
			basis.invoice_number ??
			generateDefaultInvoiceNumber(invoiceSeries ?? 'A');
		const invoiceDate =
			parseDate(body.invoiceDate ?? body.invoice_date, 'invoice_date') ??
			basis.invoice_date ??
			new Date().toISOString().slice(0, 10);
		const paymentTerms =
			parseNumber(body.paymentTermsDays ?? body.payment_terms_days, 'payment_terms_days', { min: 0 }) ??
			(basis.payment_terms_days ?? 30);
		const dueDate =
			parseDate(body.dueDate ?? body.due_date, 'due_date') ??
			(() => {
				const base = new Date(`${invoiceDate}T00:00:00Z`);
				base.setDate(base.getDate() + Number(paymentTerms));
				return base.toISOString().slice(0, 10);
			})();
		const currency = parseString(body.currency, 'currency') ?? basis.currency ?? 'SEK';
		const reverseCharge =
			parseBoolean(body.reverse_charge_building, 'reverse_charge_building') ?? basis.reverse_charge_building ?? false;
		const rotRutFlag = parseBoolean(body.rot_rut_flag, 'rot_rut_flag') ?? basis.rot_rut_flag ?? false;

		const lines: InvoiceBasisLine[] = basis.lines_json?.lines ?? [];
		const totals = basis.totals ?? calculateTotalsFromLines(lines, currency);

		const ocrRef =
			parseString(body.ocr_ref ?? body.ocrRef, 'ocr_ref') ??
			generateOcrMod10(`${invoiceNumber}${basis.project_id.replace(/[^0-9]/g, '').slice(-4) || '0000'}`);

		const signaturePayload = {
			project_id: basis.project_id,
			period_start: basis.period_start,
			period_end: basis.period_end,
			invoice_series: invoiceSeries,
			invoice_number: invoiceNumber,
			invoice_date: invoiceDate,
			due_date: dueDate,
			currency,
			lines: lines,
			totals,
			reverse_charge_building: reverseCharge,
			rot_rut_flag: rotRutFlag,
		};

		const hashSignature = createHashSignature(signaturePayload);

		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update({
				invoice_series: invoiceSeries,
				invoice_number: invoiceNumber,
				invoice_date: invoiceDate,
				due_date: dueDate,
				payment_terms_days: paymentTerms,
				ocr_ref: ocrRef,
				currency,
				reverse_charge_building: reverseCharge,
				rot_rut_flag: rotRutFlag,
				totals,
				locked: true,
				locked_by: user.id,
				locked_at: new Date().toISOString(),
				hash_signature: hashSignature,
				updated_at: new Date().toISOString(),
			})
			.eq('id', basis.id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		const { data: updatedBasis, error: reloadError } = await supabase
			.from('invoice_basis')
			.select('*')
			.eq('id', basis.id)
			.single();

		if (reloadError || !updatedBasis) {
			return NextResponse.json({ error: 'Failed to load locked invoice basis' }, { status: 500 });
		}

		try {
			const adminClient = createAdminClient();
			await adminClient.from('audit_log').insert({
				org_id: membership.org_id,
				user_id: user.id,
				action: 'invoice_basis.lock',
				entity_type: 'invoice_basis',
				entity_id: basis.id,
				old_data: {
					locked: false,
					invoice_number: basis.invoice_number,
					invoice_series: basis.invoice_series,
					ocr_ref: basis.ocr_ref,
				},
				new_data: {
					locked: true,
					invoice_number: updatedBasis.invoice_number,
					invoice_series: updatedBasis.invoice_series,
					ocr_ref: updatedBasis.ocr_ref,
					hash_signature: updatedBasis.hash_signature,
				},
			});
		} catch (auditError) {
			console.error('Failed to write audit log (lock):', auditError);
		}

		return NextResponse.json({ invoiceBasis: updatedBasis });
	} catch (error: unknown) {
		if ((error as any)?.status) {
			return NextResponse.json({ error: (error as Error).message }, { status: (error as any).status });
		}
		const message = error instanceof Error ? error.message : 'Unexpected error';
		console.error('POST /api/invoice-basis/[projectId]/lock error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


