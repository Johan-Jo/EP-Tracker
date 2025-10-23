import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay } from 'date-fns';

// GET /api/mobile/today - Get today's assignments for current user
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
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Get timezone from query param or default to UTC
		const searchParams = request.nextUrl.searchParams;
		const timezone = searchParams.get('timezone') || 'UTC';

		// Calculate today's date range (in user's timezone, but stored as UTC)
		const now = new Date();
		const todayStart = startOfDay(now);
		const todayEnd = endOfDay(now);

		// Fetch today's assignments for the user
		const { data: assignments, error: assignmentsError } = await supabase
			.from('assignments')
			.select(`
				*,
				project:projects(
					id,
					name,
					project_number,
					client_name,
					color,
					site_address
				),
				mobile_notes(
					id,
					content,
					pinned
				)
			`)
			.eq('user_id', user.id)
			.eq('org_id', membership.org_id)
			.eq('sync_to_mobile', true)
			.neq('status', 'cancelled')
			.gte('start_ts', todayStart.toISOString())
			.lte('start_ts', todayEnd.toISOString())
			.order('start_ts', { ascending: true });

		if (assignmentsError) {
			console.error('Error fetching today assignments:', assignmentsError);
			return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
		}

		// Get last sync timestamp for offline support
		const lastUpdated = new Date().toISOString();

		return NextResponse.json({
			assignments: assignments || [],
			sync: {
				last_updated: lastUpdated,
				timezone: timezone,
			},
		}, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/mobile/today:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

