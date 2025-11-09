import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function assertAdmin(role: string) {
	if (role !== 'admin') {
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

		assertAdmin(membership.role);

		if (!projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
		}

		const periodStart = body.periodStart || body.period_start;
		const periodEnd = body.periodEnd || body.period_end;
		const reason = body.reason;

		if (!periodStart || !periodEnd) {
			return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 });
		}

		if (!DATE_REGEX.test(periodStart) || !DATE_REGEX.test(periodEnd)) {
			return NextResponse.json({ error: 'periodStart and periodEnd must be YYYY-MM-DD' }, { status: 400 });
		}

		if (periodStart > periodEnd) {
			return NextResponse.json({ error: 'periodEnd must be on or after periodStart' }, { status: 400 });
		}

		if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
			return NextResponse.json({ error: 'Unlock reason must be at least 5 characters' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: basis, error: fetchError } = await supabase
			.from('invoice_basis')
			.select('id, locked')
			.eq('org_id', membership.org_id)
			.eq('project_id', projectId)
			.eq('period_start', periodStart)
			.eq('period_end', periodEnd)
			.single();

		if (fetchError || !basis) {
			return NextResponse.json({ error: 'Invoice basis not found for period' }, { status: 404 });
		}

		if (!basis.locked) {
			return NextResponse.json({ error: 'Invoice basis is not locked' }, { status: 409 });
		}

		const { error: updateError } = await supabase
			.from('invoice_basis')
			.update({
				locked: false,
				locked_by: null,
				locked_at: null,
				hash_signature: null,
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
			return NextResponse.json({ error: 'Failed to load invoice basis after unlock' }, { status: 500 });
		}

		try {
			const adminClient = createAdminClient();
			await adminClient.from('audit_log').insert({
				org_id: membership.org_id,
				user_id: user.id,
				action: 'invoice_basis.unlock',
				entity_type: 'invoice_basis',
				entity_id: basis.id,
				old_data: { locked: true },
				new_data: { locked: false, reason },
			});
		} catch (auditError) {
			console.error('Failed to write audit log (unlock):', auditError);
		}

		return NextResponse.json({ invoiceBasis: updatedBasis });
	} catch (error: unknown) {
		if ((error as any)?.status) {
			return NextResponse.json({ error: (error as Error).message }, { status: (error as any).status });
		}
		const message = error instanceof Error ? error.message : 'Unexpected error';
		console.error('POST /api/invoice-basis/[projectId]/unlock error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


