import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const periodStart = searchParams.get('period_start');
	const periodEnd = searchParams.get('period_end');
	const status = searchParams.get('status') || 'submitted';

	if (!periodStart || !periodEnd) {
		return NextResponse.json(
			{ error: 'period_start and period_end are required' },
			{ status: 400 }
		);
	}

	const { data, error } = await supabase
		.from('mileage')
		.select(`
			*,
			user:profiles!mileage_user_id_fkey(full_name),
			project:projects(name, project_number)
		`)
		.eq('org_id', membership.org_id)
		.gte('date', periodStart)
		.lte('date', periodEnd)
		.eq('status', status)
		.order('date', { ascending: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ mileage: data });
}

