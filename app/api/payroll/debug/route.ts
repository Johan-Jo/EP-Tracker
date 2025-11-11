import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/get-session';
import { refreshPayrollBasis } from '@/lib/jobs/basis-refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function respond(body: unknown, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: {
			'Cache-Control': 'no-store',
		},
	});
}

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return respond({ ok: false, error: 'Unauthorized' }, 401);
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return respond({ ok: false, error: 'Forbidden' }, 403);
	}

	const searchParams = request.nextUrl.searchParams;
	const start = searchParams.get('start');
	const end = searchParams.get('end');
	const personId = searchParams.get('person') ?? undefined;
	const orgParam = searchParams.get('org') ?? undefined;

	if (!start || !end) {
		return respond(
			{ ok: false, error: 'Missing required query parameters: start, end' },
			400,
		);
	}

	const orgId = orgParam ?? membership.org_id;
	if (orgParam && orgParam !== membership.org_id) {
		return respond({ ok: false, error: 'Org mismatch' }, 403);
	}

	try {
		await refreshPayrollBasis(orgId, start, end, personId ? [personId] : undefined);
		return respond({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return respond({ ok: false, error: message }, 500);
	}
}

