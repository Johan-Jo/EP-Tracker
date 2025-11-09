import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { refreshInvoiceBasis } from '@/lib/jobs/invoice-basis-refresh';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateDateParam(value: string | null, paramName: string) {
	if (!value) {
		throw new Error(`${paramName} is required (YYYY-MM-DD)`);
}
	if (!DATE_REGEX.test(value)) {
		throw new Error(`${paramName} must be formatted as YYYY-MM-DD`);
	}
}

export async function GET(request: NextRequest, { params }: { params: { projectId: string } }) {
	try {
		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const projectId = params.projectId;
		if (!projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}

		const searchParams = request.nextUrl.searchParams;
		const rawPeriodStart = searchParams.get('periodStart') ?? searchParams.get('start');
		const rawPeriodEnd = searchParams.get('periodEnd') ?? searchParams.get('end');

		try {
			validateDateParam(rawPeriodStart, 'periodStart');
			validateDateParam(rawPeriodEnd, 'periodEnd');
		} catch (validationError: unknown) {
			const message = validationError instanceof Error ? validationError.message : 'Invalid period parameters';
			return NextResponse.json({ error: message }, { status: 400 });
		}

		const periodStart = rawPeriodStart as string;
		const periodEnd = rawPeriodEnd as string;

		if (periodStart > periodEnd) {
			return NextResponse.json({ error: 'periodEnd must be on or after periodStart' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id, org_id')
			.eq('id', projectId)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		if (project.org_id !== membership.org_id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const invoiceBasis = await refreshInvoiceBasis({
			orgId: membership.org_id,
			projectId,
			periodStart,
			periodEnd,
		});

		return NextResponse.json({ invoiceBasis });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unexpected error';
		console.error('GET /api/invoice-basis error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


