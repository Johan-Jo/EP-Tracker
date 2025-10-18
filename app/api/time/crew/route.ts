import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { crewClockInSchema } from '@/lib/schemas/time-entry';

// POST /api/time/crew - Create time entries for multiple users (crew clock-in)
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization and role
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Only admin and foreman can clock in crew
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Only admins and foremen can clock in crew' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = crewClockInSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Verify project belongs to user's organization
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('id', data.project_id)
			.eq('org_id', membership.org_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
		}

		// Verify all users belong to the same organization
		const { data: users, error: usersError } = await supabase
			.from('memberships')
			.select('user_id')
			.eq('org_id', membership.org_id)
			.in('user_id', data.user_ids)
			.eq('is_active', true);

		if (usersError || !users || users.length !== data.user_ids.length) {
			return NextResponse.json({ error: 'One or more users not found in organization' }, { status: 404 });
		}

		// Create time entries for all users
		const timeEntries = data.user_ids.map(userId => ({
			org_id: membership.org_id,
			user_id: userId,
			project_id: data.project_id,
			phase_id: data.phase_id,
			work_order_id: data.work_order_id,
			task_label: data.task_label,
			start_at: data.start_at,
			status: 'draft' as const,
		}));

		const { data: entries, error: insertError } = await supabase
			.from('time_entries')
			.insert(timeEntries)
			.select(`
				*,
				project:projects(id, name, project_number),
				phase:phases(id, name),
				work_order:work_orders(id, name),
				user:profiles(id, full_name, email)
			`);

		if (insertError) {
			console.error('Error creating crew time entries:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ 
			entries,
			count: entries.length,
			message: `Startat tid för ${entries.length} användare`
		}, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/time/crew:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

