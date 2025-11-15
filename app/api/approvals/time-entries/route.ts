import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
	}

	// Only admin and foreman can review time entries
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json(
			{ error: 'Endast administratörer och arbetsledare kan granska tidrapporter' },
			{ status: 403 }
		);
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const periodStart = searchParams.get('period_start');
	const periodEnd = searchParams.get('period_end');
	const status = searchParams.get('status') || 'submitted';

	if (!periodStart || !periodEnd) {
		return NextResponse.json(
			{ error: 'period_start och period_end krävs' },
			{ status: 400 }
		);
	}

	let query = supabase
		.from('time_entries')
		.select(`
			*,
			user:profiles!time_entries_user_id_fkey(full_name, email),
			project:projects(name, project_number),
			phase:phases(name)
		`)
		.eq('org_id', membership.org_id)
		.gte('start_at', periodStart)
		.lte('start_at', periodEnd)
		.order('start_at', { ascending: false });

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching time entries:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ entries: data });
}

