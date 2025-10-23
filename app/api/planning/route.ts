import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

// GET /api/planning - Fetch week planning data
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const weekParam = searchParams.get('week'); // Format: YYYY-WW or date string
		const project_id = searchParams.get('project_id');
		const user_id_filter = searchParams.get('user_id');

		// Calculate week range
		let weekStart: Date;
		let weekEnd: Date;

		if (weekParam) {
			// Parse week parameter (YYYY-WW format or ISO date)
			if (weekParam.match(/^\d{4}-W\d{2}$/)) {
				// ISO week format: YYYY-WW
				const [year, week] = weekParam.split('-W').map(Number);
				const jan4 = new Date(year, 0, 4);
				const firstMonday = new Date(jan4);
				firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
				weekStart = new Date(firstMonday);
				weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
				weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6);
			} else {
				// Assume ISO date string
				const date = parseISO(weekParam);
				weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
				weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday
			}
		} else {
			// Default to current week
			const now = new Date();
			weekStart = startOfWeek(now, { weekStartsOn: 1 });
			weekEnd = endOfWeek(now, { weekStartsOn: 1 });
		}

		// Set to start/end of day in UTC
		weekStart.setHours(0, 0, 0, 0);
		weekEnd.setHours(23, 59, 59, 999);

		// Fetch resources (users with memberships)
		const { data: resources, error: resourcesError } = await supabase
			.from('memberships')
			.select(`
				user_id,
				role,
				is_active,
				profiles:user_id (
					id,
					full_name,
					email
				)
			`)
			.eq('org_id', membership.org_id)
			.eq('is_active', true);

		if (resourcesError) {
			console.error('Error fetching resources:', resourcesError);
			return NextResponse.json({ error: resourcesError.message }, { status: 500 });
		}

		// Transform resources data
		const resourcesList = resources
			?.filter(r => r.profiles)
			.map(r => ({
				id: r.user_id,
				full_name: (r.profiles as any)?.full_name || null,
				email: (r.profiles as any)?.email || '',
				role: r.role,
				is_active: r.is_active,
			})) || [];

		// Fetch projects
		let projectsQuery = supabase
			.from('projects')
			.select('id, name, project_number, client_name, color, daily_capacity_need, status')
			.eq('org_id', membership.org_id)
			.in('status', ['active', 'paused']);

		if (project_id) {
			projectsQuery = projectsQuery.eq('id', project_id);
		}

		const { data: projects, error: projectsError } = await projectsQuery;

		if (projectsError) {
			console.error('Error fetching projects:', projectsError);
			return NextResponse.json({ error: projectsError.message }, { status: 500 });
		}

		// Fetch assignments for the week
		let assignmentsQuery = supabase
			.from('assignments')
			.select(`
				*,
				project:projects(id, name, project_number, color, client_name),
				user:profiles!assignments_user_id_fkey(id, full_name, email),
				mobile_notes(*)
			`)
			.eq('org_id', membership.org_id)
			.gte('start_ts', weekStart.toISOString())
			.lte('start_ts', weekEnd.toISOString())
			.neq('status', 'cancelled');

		if (project_id) {
			assignmentsQuery = assignmentsQuery.eq('project_id', project_id);
		}
		if (user_id_filter) {
			assignmentsQuery = assignmentsQuery.eq('user_id', user_id_filter);
		}

		const { data: assignments, error: assignmentsError } = await assignmentsQuery;

		if (assignmentsError) {
			console.error('Error fetching assignments:', assignmentsError);
			return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
		}

		// Fetch absences for the week
		let absencesQuery = supabase
			.from('absences')
			.select(`
				*,
				user:profiles!absences_user_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.or(`start_ts.lte.${weekEnd.toISOString()},end_ts.gte.${weekStart.toISOString()}`);

		if (user_id_filter) {
			absencesQuery = absencesQuery.eq('user_id', user_id_filter);
		}

		const { data: absences, error: absencesError } = await absencesQuery;

		if (absencesError) {
			console.error('Error fetching absences:', absencesError);
			return NextResponse.json({ error: absencesError.message }, { status: 500 });
		}

		return NextResponse.json({
			resources: resourcesList,
			projects: projects || [],
			assignments: assignments || [],
			absences: absences || [],
			week: {
				start: weekStart.toISOString(),
				end: weekEnd.toISOString(),
			},
		}, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/planning:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

