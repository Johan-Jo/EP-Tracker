import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
	calculateTotalsFromLines,
	DEFAULT_CURRENCY,
	InvoiceBasisLine,
	roundCurrency,
} from '@/lib/jobs/invoice-basis-refresh';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function assertRole(role: string) {
	if (!['admin', 'foreman'].includes(role)) {
		throw Object.assign(new Error('Forbidden'), { status: 403 });
	}
}

function validateDate(value: string | null, name: string) {
	if (!value) {
		throw Object.assign(new Error(`${name} is required (YYYY-MM-DD)`), { status: 400 });
	}
	if (!DATE_REGEX.test(value)) {
		throw Object.assign(new Error(`${name} must be formatted as YYYY-MM-DD`), { status: 400 });
	}
}

function coerceNumber(value: unknown, field: string, options: { min?: number } = {}): number | undefined {
	if (value === undefined) return undefined;
	if (value === null) return 0;
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
		throw Object.assign(new Error(`${field} must be a finite number`), { status: 400 });
	}
	if (options.min !== undefined && value < options.min) {
		throw Object.assign(new Error(`${field} must be >= ${options.min}`), { status: 400 });
	}
	return value;
}

function coerceString(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	if (value === null) return '';
	if (typeof value !== 'string') {
		throw Object.assign(new Error(`${field} must be a string`), { status: 400 });
	}
	return value;
}

type RouteParams = { projectId: string; lineId: string };

export async function POST(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const { projectId, lineId } = await resolveRouteParams(context);

		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		assertRole(membership.role);

		if (!projectId || !lineId) {
			return NextResponse.json({ error: 'projectId and lineId are required' }, { status: 400 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('periodStart') ?? searchParams.get('start');
		const periodEnd = searchParams.get('periodEnd') ?? searchParams.get('end');

		validateDate(periodStart, 'periodStart');
		validateDate(periodEnd, 'periodEnd');

		if (periodStart! > periodEnd!) {
			return NextResponse.json({ error: 'periodEnd must be on or after periodStart' }, { status: 400 });
		}

		const body = await request.json();
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: basis, error: fetchError } = await supabase
			.from('invoice_basis')
			.select('id, org_id, project_id, locked, lines_json, totals, currency')
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

		const linesJson = basis.lines_json ?? {};
		const lines: InvoiceBasisLine[] = Array.isArray(linesJson.lines) ? linesJson.lines : [];

		const targetIndex = lines.findIndex((item) => item && item.id === lineId);
		if (targetIndex === -1) {
			return NextResponse.json({ error: 'Line not found' }, { status: 404 });
		}

	const targetLine = lines[targetIndex];
	const oldLineSnapshot = { ...targetLine };
		if (!targetLine || targetLine.type === 'diary') {
			return NextResponse.json({ error: 'Diary lines cannot be edited via this endpoint' }, { status: 400 });
		}

		const updatedLine: InvoiceBasisLine = { ...targetLine };

		if ('description' in body) {
			const value = coerceString(body.description, 'description');
			if (value !== undefined) {
				updatedLine.description = value.trim();
			}
		}

		if ('article_code' in body) {
			const value = coerceString(body.article_code, 'article_code');
			if (value !== undefined) {
				updatedLine.article_code = value.trim() || null;
			}
		}

		if ('account' in body) {
			const value = coerceString(body.account, 'account');
			if (value !== undefined) {
				updatedLine.account = value.trim() || null;
			}
		}

		if ('unit' in body) {
			const value = coerceString(body.unit, 'unit');
			if (value !== undefined) {
				updatedLine.unit = value.trim() || null;
			}
		}

		if ('vat_code' in body) {
			const value = coerceString(body.vat_code, 'vat_code');
			if (value !== undefined) {
				updatedLine.vat_code = value.trim() || null;
			}
		}

		if ('dimensions' in body) {
			if (body.dimensions !== null && typeof body.dimensions !== 'object') {
				return NextResponse.json({ error: 'dimensions must be an object' }, { status: 400 });
			}
			updatedLine.dimensions = { ...(targetLine.dimensions ?? {}), ...(body.dimensions ?? {}) };
		}

		const quantity = coerceNumber(body.quantity, 'quantity', { min: 0 });
		if (quantity !== undefined) {
			updatedLine.quantity = roundCurrency(quantity);
		}

		const unitPrice = coerceNumber(body.unit_price, 'unit_price', { min: 0 });
		if (unitPrice !== undefined) {
			updatedLine.unit_price = roundCurrency(unitPrice);
		}

		const discount = coerceNumber(body.discount, 'discount', { min: 0 });
		if (discount !== undefined) {
			updatedLine.discount = Math.min(roundCurrency(discount), 100);
		}

		const vatRate = coerceNumber(body.vat_rate, 'vat_rate', { min: 0 });
		if (vatRate !== undefined) {
			updatedLine.vat_rate = roundCurrency(vatRate);
		}

		if ('attachments' in body) {
			if (!Array.isArray(body.attachments) || body.attachments.some((item: unknown) => typeof item !== 'string')) {
				return NextResponse.json({ error: 'attachments must be an array of strings' }, { status: 400 });
			}
			updatedLine.attachments = body.attachments;
		}

		if ('amount' in body) {
			const amount = coerceNumber(body.amount, 'amount', { min: 0 });
			if (amount !== undefined) {
				const effectiveQuantity = updatedLine.quantity || targetLine.quantity || 0;
				if (effectiveQuantity <= 0) {
					return NextResponse.json({ error: 'Cannot set amount when quantity is zero' }, { status: 400 });
				}
				updatedLine.unit_price = roundCurrency(amount / effectiveQuantity);
			}
		}

		lines[targetIndex] = updatedLine;

		const totals = calculateTotalsFromLines(lines, basis.currency ?? DEFAULT_CURRENCY);

		const updatePayload = {
			lines_json: { ...linesJson, lines },
			totals,
			updated_at: new Date().toISOString(),
		};

		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update(updatePayload)
			.eq('id', basis.id);

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		const { data: updatedBasis, error: reloadError } = await supabase
			.from('invoice_basis')
			.select('id, lines_json, totals')
			.eq('id', basis.id)
			.single();

		if (reloadError || !updatedBasis) {
			return NextResponse.json({ error: 'Failed to load updated invoice basis' }, { status: 500 });
		}

		const updatedLines = Array.isArray(updatedBasis.lines_json?.lines) ? updatedBasis.lines_json.lines : [];
		const updatedLineResponse = updatedLines.find((line: InvoiceBasisLine) => line && line.id === lineId);

	try {
		const adminClient = createAdminClient();
		await adminClient.from('audit_log').insert({
			org_id: membership.org_id,
			user_id: user.id,
			action: 'invoice_basis.line.update',
			entity_type: 'invoice_basis',
			entity_id: basis.id,
			old_data: {
				line_id: lineId,
				line: oldLineSnapshot,
			},
			new_data: {
				line_id: lineId,
				line: updatedLineResponse ?? updatedLine,
			},
		});
	} catch (auditError) {
		console.error('Failed to write audit log (line update):', auditError);
	}

		return NextResponse.json({
			line: updatedLineResponse ?? updatedLine,
			totals: updatedBasis.totals ?? totals,
		});
	} catch (error: unknown) {
		if ((error as any)?.status) {
			return NextResponse.json({ error: (error as Error).message }, { status: (error as any).status });
		}
		const message = error instanceof Error ? error.message : 'Unexpected error';
		console.error('POST /api/invoice-basis/[projectId]/lines/[lineId] error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


