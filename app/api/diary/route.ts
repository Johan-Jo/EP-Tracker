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
			project:projects(name, project_number, is_locked),
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
	// Block create if project is locked
	const { data: lockProject } = await supabase
		.from('projects')
		.select('id, is_locked')
		.eq('id', body.project_id)
		.eq('org_id', membership.org_id)
		.single();

	if (lockProject?.is_locked) {
		return NextResponse.json({ error: 'Project is locked. Diary entries cannot be modified.' }, { status: 403 });
	}

	// Validate date format (YYYY-MM-DD string only)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
		return NextResponse.json({ error: 'Invalid date format. Must be YYYY-MM-DD' }, { status: 400 });
	}

	console.log('[Diary API] Received date (string):', body.date);

	// Call RPC with typed DATE parameter - prevents timezone conversion
	const { data, error } = await supabase
		.rpc('insert_diary_entry', {
			p_org_id: membership.org_id,
			p_project_id: body.project_id,
			p_created_by: user.id,
			p_date: body.date, // String sent to DATE parameter (no tz conversion)
			p_weather: body.weather || null,
			p_temperature_c: body.temperature_c || null,
			p_crew_count: body.crew_count || null,
			p_work_performed: body.work_performed || null,
			p_obstacles: body.obstacles || null,
			p_safety_notes: body.safety_notes || null,
			p_deliveries: body.deliveries || null,
			p_visitors: body.visitors || null,
			p_signature_name: body.signature_name || null,
			p_signature_timestamp: body.signature_timestamp || null,
		})
		.single();

	if (error) {
		// Surface exact error message (includes duplicate constraint message)
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ diary: data }, { status: 201 });
}

