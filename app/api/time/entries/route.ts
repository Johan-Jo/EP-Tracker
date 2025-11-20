import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTimeEntrySchema } from '@/lib/schemas/time-entry';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session
import { sendTeamCheckInNotification } from '@/lib/notifications'; // EPIC 25: Push notifications

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
	const limit = parseInt(searchParams.get('limit') || '200');
	const include_stats = searchParams.get('include_stats') === 'true';

	// ✅ PERFORMANCE: Default to last 3 months if no date filter is set
	// This prevents loading thousands of historical entries on initial load
	let effectiveStartDate = start_date;
	let effectiveEndDate = end_date;
	
	if (!start_date && !end_date) {
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
		effectiveStartDate = threeMonthsAgo.toISOString().split('T')[0];
		effectiveEndDate = new Date().toISOString().split('T')[0];
	}

	// ✅ PERFORMANCE: Select only needed columns instead of *
	// Reduces payload size by ~40-50% for better network transfer
	let query = supabase
		.from('time_entries')
		.select(`
			id,
			org_id,
			user_id,
			project_id,
			phase_id,
			work_order_id,
			task_label,
			start_at,
			stop_at,
			duration_min,
			status,
			billing_type,
			fixed_block_id,
			ata_id,
			notes,
			created_at,
			updated_at,
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
	
	// ✅ PERFORMANCE: Always apply date filter (default to last 3 months if not specified)
	if (effectiveStartDate) query = query.gte('start_at', effectiveStartDate);
	if (effectiveEndDate) query = query.lte('start_at', `${effectiveEndDate}T23:59:59`);

		// Workers only see their own entries; admin/foreman/finance see all
		if (membership.role === 'worker') {
			query = query.eq('user_id', user.id);
		}

		const { data: entries, error } = await query;

		if (error) {
			console.error('Error fetching time entries:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// ✅ PERFORMANCE: Calculate stats server-side if requested
		// Only fetches start_at and duration_min (minimal data) for stats calculation
		// This is much faster than calculating on client-side from all entries
		let stats = null;
		if (include_stats) {
			const effectiveUserId = membership.role === 'worker' ? user.id : (user_id || null);
			
			// Build stats query with same filters, but only fetch minimal columns needed
			let statsQuery = supabase
				.from('time_entries')
				.select('start_at, duration_min') // ✅ Only fetch what we need for stats
				.eq('org_id', membership.org_id);
			
			if (effectiveUserId) statsQuery = statsQuery.eq('user_id', effectiveUserId);
			if (project_id) statsQuery = statsQuery.eq('project_id', project_id);
			if (status) statsQuery = statsQuery.eq('status', status);
			if (effectiveStartDate) statsQuery = statsQuery.gte('start_at', effectiveStartDate);
			if (effectiveEndDate) statsQuery = statsQuery.lte('start_at', `${effectiveEndDate}T23:59:59`);

			const { data: statsData, error: statsError } = await statsQuery;

			if (!statsError && statsData) {
				const now = new Date();
				const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				const yesterdayStart = new Date(todayStart);
				yesterdayStart.setDate(yesterdayStart.getDate() - 1);
				
				// Week starts on Monday
				const weekStart = new Date(todayStart);
				const day = weekStart.getDay();
				const diff = day === 0 ? 6 : day - 1;
				weekStart.setDate(weekStart.getDate() - diff);
				
				const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

				let today = 0, yesterday = 0, thisWeek = 0, thisMonth = 0;

				// ✅ PERFORMANCE: Single pass through data for all stats
				statsData.forEach((entry: any) => {
					const startDate = new Date(entry.start_at);
					const duration = entry.duration_min || 0;

					if (startDate >= todayStart) {
						today += duration;
					}
					if (startDate >= yesterdayStart && startDate < todayStart) {
						yesterday += duration;
					}
					if (startDate >= weekStart) {
						thisWeek += duration;
					}
					if (startDate >= monthStart) {
						thisMonth += duration;
					}
				});

				stats = { today, yesterday, thisWeek, thisMonth };
			}
		}

		return NextResponse.json({ entries, stats }, { status: 200 });
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
				billing_type: data.billing_type,
				fixed_block_id: data.fixed_block_id ?? null,
				ata_id: data.ata_id ?? null,
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

		// EPIC 25: Send team check-in notification
		// Don't await - fire and forget to keep API fast
		if (entry) {
			sendTeamCheckInNotification({
				userId: user.id,
				userName: user.user_metadata?.full_name || user.email || 'Unknown',
				projectId: entry.project_id,
				action: entry.stop_at ? 'checkout' : 'checkin',
				timestamp: entry.stop_at || entry.start_at,
			}).catch((err) => {
				console.error('[Time Entry] Failed to send team notification:', err);
			});
		}

		return NextResponse.json({ entry }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/time/entries:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

