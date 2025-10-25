import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';

// GET /api/planning - Fetch week planning data
// EPIC 26.6: Optimized with parallel queries and session caching
export async function GET(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 2 queries!)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

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

	// EPIC 26.6: Build queries (don't execute yet)
	const resourcesQuery = supabase
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

	let projectsQuery = supabase
		.from('projects')
		.select('id, name, project_number, client_name, color, daily_capacity_need, status, site_address')
		.eq('org_id', membership.org_id)
		.in('status', ['active', 'paused']);

	if (project_id) {
		projectsQuery = projectsQuery.eq('id', project_id);
	}

	// EPIC 26.6: Remove JOINs - client already has projects/users!
	let assignmentsQuery = supabase
		.from('assignments')
		.select('*')
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

	// EPIC 26.6: Remove JOINs - client already has users!
	let absencesQuery = supabase
		.from('absences')
		.select('*')
		.eq('org_id', membership.org_id)
		.or(`start_ts.lte.${weekEnd.toISOString()},end_ts.gte.${weekStart.toISOString()}`);

	if (user_id_filter) {
		absencesQuery = absencesQuery.eq('user_id', user_id_filter);
	}

	// EPIC 26.6: Execute ALL queries in parallel! ⚡
	const [resourcesResult, projectsResult, assignmentsResult, absencesResult] = await Promise.all([
		resourcesQuery,
		projectsQuery,
		assignmentsQuery,
		absencesQuery,
	]);

	// Check for errors
	if (resourcesResult.error) {
		console.error('Error fetching resources:', resourcesResult.error);
		return NextResponse.json({ error: resourcesResult.error.message }, { status: 500 });
	}
	if (projectsResult.error) {
		console.error('Error fetching projects:', projectsResult.error);
		return NextResponse.json({ error: projectsResult.error.message }, { status: 500 });
	}
	if (assignmentsResult.error) {
		console.error('Error fetching assignments:', assignmentsResult.error);
		return NextResponse.json({ error: assignmentsResult.error.message }, { status: 500 });
	}
	if (absencesResult.error) {
		console.error('Error fetching absences:', absencesResult.error);
		return NextResponse.json({ error: absencesResult.error.message }, { status: 500 });
	}

	// Transform resources data
	const resourcesList = resourcesResult.data
		?.filter(r => r.profiles)
		.map(r => ({
			id: r.user_id,
			full_name: (r.profiles as any)?.full_name || null,
			email: (r.profiles as any)?.email || '',
			role: r.role,
			is_active: r.is_active,
		})) || [];

	return NextResponse.json({
		resources: resourcesList,
		projects: projectsResult.data || [],
		assignments: assignmentsResult.data || [],
		absences: absencesResult.data || [],
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

