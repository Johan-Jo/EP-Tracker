import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTimeEntrySchema } from '@/lib/schemas/time-entry';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session
import { notifyTeamCheckIn } from '@/lib/notifications'; // EPIC 25: Push notifications

// GET /api/time/entries - List time entries with filters
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
		const project_id = searchParams.get('project_id');
		const user_id = searchParams.get('user_id');
		const status = searchParams.get('status');
		const start_date = searchParams.get('start_date');
		const end_date = searchParams.get('end_date');
		const limit = parseInt(searchParams.get('limit') || '100');

	// Build query
	let query = supabase
		.from('time_entries')
		.select(`
			*,
			project:projects(id, name, project_number),
			phase:phases(id, name),
			work_order:work_orders(id, name),
			user:profiles!time_entries_user_id_fkey(id, full_name, email),
			approved_by_user:profiles!time_entries_approved_by_fkey(id, full_name, email)
		`)
		.eq('org_id', membership.org_id)
		.order('start_at', { ascending: false })
		.limit(limit);

		// Apply filters
		if (project_id) query = query.eq('project_id', project_id);
		if (user_id) query = query.eq('user_id', user_id);
		if (status) query = query.eq('status', status);
		if (start_date) query = query.gte('start_at', start_date);
		if (end_date) query = query.lte('start_at', end_date);

		// Workers only see their own entries; admin/foreman/finance see all
		if (membership.role === 'worker') {
			query = query.eq('user_id', user.id);
		}

		const { data: entries, error } = await query;

		if (error) {
			console.error('Error fetching time entries:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ entries }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/time/entries:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/time/entries - Create new time entry
// EPIC 26: Optimized from 4 queries to 1 query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = createTimeEntrySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// EPIC 26: Skip project verification - RLS will handle it
		// This saves 1 query and makes the API faster
		const supabase = await createClient();

		// EPIC 26: Insert time entry without JOINs for maximum speed
		// Client already has project/phase data cached, no need to fetch it again
		const { data: entry, error: insertError } = await supabase
			.from('time_entries')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				project_id: data.project_id,
				phase_id: data.phase_id,
				work_order_id: data.work_order_id,
				task_label: data.task_label,
				start_at: data.start_at,
				stop_at: data.stop_at,
				notes: data.notes,
				status: 'draft',
			})
			.select('*')
			.single();

		if (insertError) {
			console.error('Error creating time entry:', insertError);
			// Better error message if project doesn't exist or access denied
			if (insertError.code === '23503') {
				return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
			}
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		// EPIC 25: Notify team leads when someone checks in
		// Only notify on check-in (no stop_at), not on full entry creation
		if (!entry.stop_at && entry.project_id) {
			notifyTeamCheckIn({
				userId: user.id,
				projectId: entry.project_id,
				action: 'check_in',
			}).catch((error) => {
				// Don't fail the request if notification fails
				console.error('Failed to send check-in notification:', error);
			});
		}

		return NextResponse.json({ entry }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/time/entries:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

