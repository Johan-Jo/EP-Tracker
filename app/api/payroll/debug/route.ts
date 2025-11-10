import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/get-session';
import { refreshPayrollBasis } from '@/lib/jobs/basis-refresh';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
	}

	const searchParams = request.nextUrl.searchParams;
	const start = searchParams.get('start');
	const end = searchParams.get('end');
	const personId = searchParams.get('person') ?? undefined;
	const orgParam = searchParams.get('org') ?? undefined;

	if (!start || !end) {
		return NextResponse.json(
			{ ok: false, error: 'Missing required query parameters: start, end' },
			{ status: 400 },
		);
	}

	const orgId = orgParam ?? membership.org_id;
	if (orgParam && orgParam !== membership.org_id) {
		return NextResponse.json({ ok: false, error: 'Org mismatch' }, { status: 403 });
	}

	try {
		await refreshPayrollBasis(orgId, start, end, personId ? [personId] : undefined);
		return NextResponse.json(
			{ ok: true },
			{ status: 200, headers: { 'cache-control': 'no-store' } },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{ ok: false, error: message },
			{ status: 500, headers: { 'cache-control': 'no-store' } },
		);
	}
}

