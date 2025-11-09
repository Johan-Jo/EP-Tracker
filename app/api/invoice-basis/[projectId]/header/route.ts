import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown, field: string): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
		throw new Error(`${field} must be a string formatted as YYYY-MM-DD`);
	}
	return value;
}

function parseInteger(value: unknown, field: string, options: { min?: number; max?: number } = {}): number | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'number') {
		throw new Error(`${field} must be a number`);
	}
	if (!Number.isInteger(value)) {
		throw new Error(`${field} must be an integer`);
	}
	if (options.min !== undefined && value < options.min) {
		throw new Error(`${field} must be >= ${options.min}`);
	}
	if (options.max !== undefined && value > options.max) {
		throw new Error(`${field} must be <= ${options.max}`);
	}
	return value;
}

function parseNumber(value: unknown, field: string, options: { min?: number } = {}): number | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
		throw new Error(`${field} must be a finite number`);
	}
	if (options.min !== undefined && value < options.min) {
		throw new Error(`${field} must be >= ${options.min}`);
	}
	return value;
}

function parseBoolean(value: unknown, field: string): boolean | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'boolean') {
		throw new Error(`${field} must be boolean`);
	}
	return value;
}

function assertRole(role: string) {
	if (!['admin', 'foreman'].includes(role)) {
		throw Object.assign(new Error('Forbidden'), { status: 403 });
	}
}

type RouteParams = { projectId: string };

export async function POST(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const { projectId } = await resolveRouteParams(context);

		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		assertRole(membership.role);

		if (!projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('periodStart') ?? searchParams.get('start');
		const periodEnd = searchParams.get('periodEnd') ?? searchParams.get('end');

		if (!periodStart || !periodEnd) {
			return NextResponse.json({ error: 'periodStart and periodEnd query params are required' }, { status: 400 });
		}
		if (!DATE_REGEX.test(periodStart) || !DATE_REGEX.test(periodEnd)) {
			return NextResponse.json({ error: 'periodStart and periodEnd must be YYYY-MM-DD'}, { status: 400 });
		}
		if (periodStart > periodEnd) {
			return NextResponse.json({ error: 'periodEnd must be on or after periodStart' }, { status: 400 });
		}

		const body = await request.json();
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
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
			return NextResponse.json({ error: 'Invoice basis is locked and cannot be edited' }, { status: 409 });
		}

		const oldHeaderSnapshot = {
			invoice_series: basis.invoice_series,
			invoice_number: basis.invoice_number,
			invoice_date: basis.invoice_date,
			due_date: basis.due_date,
			payment_terms_days: basis.payment_terms_days,
			ocr_ref: basis.ocr_ref,
			our_ref: basis.our_ref,
			your_ref: basis.your_ref,
			currency: basis.currency,
			reverse_charge_building: basis.reverse_charge_building,
			rot_rut_flag: basis.rot_rut_flag,
			cost_center: basis.cost_center,
			result_unit: basis.result_unit,
			invoice_address_json: basis.invoice_address_json,
			delivery_address_json: basis.delivery_address_json,
			worksite_address_json: basis.worksite_address_json,
			worksite_id: basis.worksite_id,
		};

		const updatePayload: Record<string, unknown> = {};

		if ('invoice_series' in body) {
			if (body.invoice_series !== null && typeof body.invoice_series !== 'string') {
				throw new Error('invoice_series must be a string or null');
			}
			updatePayload.invoice_series = body.invoice_series;
		}

		if ('invoice_number' in body) {
			if (body.invoice_number !== null && typeof body.invoice_number !== 'string') {
				throw new Error('invoice_number must be a string or null');
			}
			updatePayload.invoice_number = body.invoice_number;
		}

		if ('invoice_date' in body) {
			updatePayload.invoice_date = parseDate(body.invoice_date, 'invoice_date');
		}

		if ('due_date' in body) {
			updatePayload.due_date = parseDate(body.due_date, 'due_date');
		}

		if ('payment_terms_days' in body) {
			updatePayload.payment_terms_days = parseInteger(body.payment_terms_days, 'payment_terms_days', { min: 0, max: 365 });
		}

		if ('ocr_ref' in body) {
			if (body.ocr_ref !== null && typeof body.ocr_ref !== 'string') {
				throw new Error('ocr_ref must be a string or null');
			}
			updatePayload.ocr_ref = body.ocr_ref;
		}

		if ('currency' in body) {
			if (body.currency !== null && typeof body.currency !== 'string') {
				throw new Error('currency must be a string or null');
			}
			updatePayload.currency = body.currency;
		}

		if ('fx_rate' in body) {
			updatePayload.fx_rate = parseNumber(body.fx_rate, 'fx_rate', { min: 0 });
		}

		if ('our_ref' in body) {
			if (body.our_ref !== null && typeof body.our_ref !== 'string') {
				throw new Error('our_ref must be a string or null');
			}
			updatePayload.our_ref = body.our_ref;
		}

		if ('your_ref' in body) {
			if (body.your_ref !== null && typeof body.your_ref !== 'string') {
				throw new Error('your_ref must be a string or null');
			}
			updatePayload.your_ref = body.your_ref;
		}

		if ('reverse_charge_building' in body) {
			const value = parseBoolean(body.reverse_charge_building, 'reverse_charge_building');
			if (value !== null) {
				updatePayload.reverse_charge_building = value;
			}
		}

		if ('rot_rut_flag' in body) {
			const value = parseBoolean(body.rot_rut_flag, 'rot_rut_flag');
			if (value !== null) {
				updatePayload.rot_rut_flag = value;
			}
		}

		if ('cost_center' in body) {
			if (body.cost_center !== null && typeof body.cost_center !== 'string') {
				throw new Error('cost_center must be a string or null');
			}
			updatePayload.cost_center = body.cost_center;
		}

		if ('result_unit' in body) {
			if (body.result_unit !== null && typeof body.result_unit !== 'string') {
				throw new Error('result_unit must be a string or null');
			}
			updatePayload.result_unit = body.result_unit;
		}

		if ('invoice_address_json' in body) {
			if (body.invoice_address_json !== null && typeof body.invoice_address_json !== 'object') {
				throw new Error('invoice_address_json must be an object or null');
			}
			updatePayload.invoice_address_json = body.invoice_address_json;
		}

		if ('delivery_address_json' in body) {
			if (body.delivery_address_json !== null && typeof body.delivery_address_json !== 'object') {
				throw new Error('delivery_address_json must be an object or null');
			}
			updatePayload.delivery_address_json = body.delivery_address_json;
		}

		if ('worksite_address_json' in body) {
			if (body.worksite_address_json !== null && typeof body.worksite_address_json !== 'object') {
				throw new Error('worksite_address_json must be an object or null');
			}
			updatePayload.worksite_address_json = body.worksite_address_json;
		}

		if ('worksite_id' in body) {
			if (body.worksite_id !== null && typeof body.worksite_id !== 'string') {
				throw new Error('worksite_id must be a UUID string or null');
			}
			updatePayload.worksite_id = body.worksite_id;
		}

		// Auto-calculate due_date if not explicitly provided but invoice_date and payment terms exists
		if (
			updatePayload.invoice_date &&
			(updatePayload.payment_terms_days !== undefined || updatePayload.due_date === undefined)
		) {
			const basisPaymentTerms =
				updatePayload.payment_terms_days !== undefined
					? updatePayload.payment_terms_days ?? 0
					: basis.payment_terms_days ?? 0;
			const invoiceDate = new Date(`${updatePayload.invoice_date}T00:00:00Z`);
			if (!Number.isNaN(invoiceDate.getTime())) {
				const dueDate = new Date(invoiceDate);
				dueDate.setDate(dueDate.getDate() + Number(basisPaymentTerms));
				updatePayload.due_date = dueDate.toISOString().slice(0, 10);
			}
		}

		if (Object.keys(updatePayload).length === 0) {
			return NextResponse.json({ error: 'No recognized fields to update' }, { status: 400 });
		}

		updatePayload.updated_at = new Date().toISOString();

		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update(updatePayload)
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
			return NextResponse.json({ error: 'Failed to load updated invoice basis' }, { status: 500 });
		}

		const newHeaderSnapshot = {
			invoice_series: updatedBasis.invoice_series,
			invoice_number: updatedBasis.invoice_number,
			invoice_date: updatedBasis.invoice_date,
			due_date: updatedBasis.due_date,
			payment_terms_days: updatedBasis.payment_terms_days,
			ocr_ref: updatedBasis.ocr_ref,
			our_ref: updatedBasis.our_ref,
			your_ref: updatedBasis.your_ref,
			currency: updatedBasis.currency,
			reverse_charge_building: updatedBasis.reverse_charge_building,
			rot_rut_flag: updatedBasis.rot_rut_flag,
			cost_center: updatedBasis.cost_center,
			result_unit: updatedBasis.result_unit,
			invoice_address_json: updatedBasis.invoice_address_json,
			delivery_address_json: updatedBasis.delivery_address_json,
			worksite_address_json: updatedBasis.worksite_address_json,
			worksite_id: updatedBasis.worksite_id,
		};

		try {
			const adminClient = createAdminClient();
			await adminClient.from('audit_log').insert({
				org_id: membership.org_id,
				user_id: user.id,
				action: 'invoice_basis.header.update',
				entity_type: 'invoice_basis',
				entity_id: basis.id,
				old_data: oldHeaderSnapshot,
				new_data: newHeaderSnapshot,
			});
		} catch (auditError) {
			console.error('Failed to write audit log (header update):', auditError);
		}

		return NextResponse.json({ invoiceBasis: updatedBasis });
	} catch (error: unknown) {
		if ((error as any)?.status) {
			return NextResponse.json({ error: (error as Error).message }, { status: (error as any).status });
		}
		const message = error instanceof Error ? error.message : 'Unexpected error';
		console.error('POST /api/invoice-basis/[projectId]/header error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


