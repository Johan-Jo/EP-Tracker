import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const projectId = searchParams.get('project_id');

	let query = supabase
		.from('diary_entries')
		.select(`
			*,
			project:projects(name, project_number),
			created_by_profile:profiles!diary_entries_created_by_fkey(full_name)
		`)
		.eq('org_id', membership.org_id)
		.order('date', { ascending: false });

	if (projectId) {
		query = query.eq('project_id', projectId);
	}

	const { data, error } = await query;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ diary: data });
}

export async function POST(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = await createClient();
	const body = await request.json();

	const { data, error } = await supabase
		.from('diary_entries')
		.insert({
			...body,
			org_id: membership.org_id,
			created_by: user.id,
		})
		.select()
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ diary: data });
}

