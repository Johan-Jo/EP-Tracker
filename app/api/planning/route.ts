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

	// EPIC 26.6 Part 2: Use database function for maximum speed! ⚡
	// This consolidates 4 queries into 1 optimized database-side query
	const { data: planningData, error: planningError } = await supabase
		.rpc('get_planning_data', {
			p_org_id: membership.org_id,
			p_week_start: weekStart.toISOString(),
			p_week_end: weekEnd.toISOString(),
			p_project_id: project_id || null,
			p_user_id_filter: user_id_filter || null,
		});

	if (planningError) {
		console.error('Error fetching planning data:', planningError);
		return NextResponse.json({ error: planningError.message }, { status: 500 });
	}

	return NextResponse.json({
		resources: planningData?.resources || [],
		projects: planningData?.projects || [],
		assignments: planningData?.assignments || [],
		absences: planningData?.absences || [],
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

