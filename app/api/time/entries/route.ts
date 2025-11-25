import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTimeEntrySchema } from '@/lib/schemas/time-entry';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session
import { sendTeamCheckInNotification } from '@/lib/notifications'; // EPIC 25: Push notifications
import { calculateWorkMinutes } from '@/lib/utils/break-deduction';

// GET /api/time/entries - List time entries with filters
export async function GET(request: NextRequest) {
	// FORCE LOG - Always show
	console.warn('🔍 [TIME ENTRIES API] GET request received');
	
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			console.error('❌ [TIME ENTRIES API] Auth error:', authError);
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.warn('🔍 [TIME ENTRIES API] User authenticated:', user.id);

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			console.error('❌ [TIME ENTRIES API] No membership found for user:', user.id);
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		console.warn('🔍 [TIME ENTRIES API] Membership found:', { org_id: membership.org_id, role: membership.role });

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
	// TEMPORARY FIX: Increase to 6 months to include all entries (Sept-Nov 2025)
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
	// ✅ SOFT DELETE: Exclude soft-deleted entries (deleted_at IS NULL)
	// NOTE: Only filter by deleted_at if the column exists (after migration is applied)
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
			user:profiles!user_id(id, full_name, email),
			approved_by_user:profiles!approved_by(id, full_name, email),
			ata:ata(id, title, status)
		`)
		.eq('org_id', membership.org_id);
		// TODO: Uncomment after applying soft delete migration
		// .is('deleted_at', null) // Exclude soft-deleted entries

	// Apply filters BEFORE ordering and limiting
	if (project_id) query = query.eq('project_id', project_id);
	if (user_id) query = query.eq('user_id', user_id);
	if (status) query = query.eq('status', status);
	
	// ✅ PERFORMANCE: Always apply date filter (default to last 3 months if not specified)
	// Apply date filters - Supabase supports chaining gte and lte on same column
	if (effectiveStartDate) {
		// Ensure start date is in ISO format
		const startDate = effectiveStartDate.includes('T') ? effectiveStartDate : `${effectiveStartDate}T00:00:00.000Z`;
		query = query.gte('start_at', startDate);
	}
	if (effectiveEndDate) {
		// Format end date properly - use end of day in ISO format
		const endDate = effectiveEndDate.includes('T') 
			? effectiveEndDate 
			: `${effectiveEndDate}T23:59:59.999Z`;
		query = query.lte('start_at', endDate);
	}

	// Workers only see their own entries; admin/foreman/finance see all
	if (membership.role === 'worker') {
		query = query.eq('user_id', user.id);
	}

	// Apply ordering and limit AFTER all filters
	query = query.order('start_at', { ascending: false }).limit(limit);

	const { data: entries, error } = await query;

	// FORCE LOG - Always show, even in production
	console.warn('🔍 [TIME ENTRIES API] Query executed:', {
		org_id: membership.org_id,
		user_id: user.id,
		role: membership.role,
		effectiveStartDate,
		effectiveEndDate,
		project_id,
		user_id,
		status,
		entriesCount: entries?.length || 0,
		hasError: !!error
	});

	if (error) {
		console.error('❌ [TIME ENTRIES API] ERROR:', error);
		console.error('❌ [TIME ENTRIES API] Query details:', {
			org_id: membership.org_id,
			user_id: user.id,
			role: membership.role,
			effectiveStartDate,
			effectiveEndDate,
			project_id,
			user_id,
			status
		});
		return NextResponse.json({ 
			error: error.message,
			details: error.details,
			hint: error.hint
		}, { status: 500 });
	}

	// FORCE LOG - Always show
	console.warn(`✅ [TIME ENTRIES API] Found ${entries?.length || 0} entries for org ${membership.org_id}, user ${user.id}, role ${membership.role}`);

	// Fetch work orders separately to avoid RLS issues with nested joins
	let enrichedEntries = entries;
	if (entries && entries.length > 0) {
		const entriesWithWorkOrders = entries.filter((e: any) => e.work_order_id);
		if (entriesWithWorkOrders.length > 0) {
			try {
				const workOrderIds = [...new Set(entriesWithWorkOrders.map((e: any) => e.work_order_id))];
				const { data: workOrders, error: workOrdersError } = await supabase
					.from('work_orders')
					.select('id, title')
					.in('id', workOrderIds)
					.eq('organization_id', membership.org_id);
				
				// Map work orders to entries (even if query fails, entries still have work_order_id)
				if (workOrders && !workOrdersError) {
					const workOrderMap = new Map(workOrders.map((wo: any) => [wo.id, wo]));
					enrichedEntries = entries.map((entry: any) => ({
						...entry,
						work_order: entry.work_order_id ? (workOrderMap.get(entry.work_order_id) || null) : null
					}));
				} else {
					// If work_orders query fails, just set work_order to null for all entries
					console.warn('⚠️ [TIME ENTRIES API] Failed to fetch work_orders:', workOrdersError);
					enrichedEntries = entries.map((entry: any) => ({
						...entry,
						work_order: null
					}));
				}
			} catch (error) {
				// If anything goes wrong, return entries without work_order data
				console.error('❌ [TIME ENTRIES API] Error fetching work_orders:', error);
				enrichedEntries = entries.map((entry: any) => ({
					...entry,
					work_order: null
				}));
			}
		} else {
			// No entries with work_order_id, just ensure work_order is null for all
			enrichedEntries = entries.map((entry: any) => ({
				...entry,
				work_order: null
			}));
		}
	}

		// Sort entries: first by start_at (descending), then by created_at (descending) for consistent ordering
		// This ensures entries with the same start_at are sorted by creation time (newest first)
		if (enrichedEntries && enrichedEntries.length > 0) {
			enrichedEntries.sort((a, b) => {
				const startAtA = new Date(a.start_at).getTime();
				const startAtB = new Date(b.start_at).getTime();
				if (startAtB !== startAtA) {
					return startAtB - startAtA; // Descending by start_at
				}
				// If start_at is the same, sort by created_at (descending) - newest first
				const createdAtA = new Date(a.created_at).getTime();
				const createdAtB = new Date(b.created_at).getTime();
				return createdAtB - createdAtA;
			});
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
				// TODO: Uncomment after applying soft delete migration
				// .is('deleted_at', null); // ✅ SOFT DELETE: Exclude soft-deleted entries
			
			if (effectiveUserId) statsQuery = statsQuery.eq('user_id', effectiveUserId);
			if (project_id) statsQuery = statsQuery.eq('project_id', project_id);
			if (status) statsQuery = statsQuery.eq('status', status);
			if (effectiveStartDate) {
				const startDate = effectiveStartDate.includes('T') ? effectiveStartDate : `${effectiveStartDate}T00:00:00.000Z`;
				statsQuery = statsQuery.gte('start_at', startDate);
			}
			if (effectiveEndDate) {
				const endDate = effectiveEndDate.includes('T')
					? effectiveEndDate
					: `${effectiveEndDate}T23:59:59.999Z`;
				statsQuery = statsQuery.lte('start_at', endDate);
			}

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

		return NextResponse.json({ entries: enrichedEntries || entries, stats }, { status: 200 });
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

		// Fetch organization break settings (needed for calculations)
		const { data: orgSettings } = await supabase
			.from('organizations')
			.select('standard_break_minutes_per_day, standard_breaks')
			.eq('id', membership.org_id)
			.single();

		const orgBreakSettings = orgSettings ? {
			standard_break_minutes_per_day: orgSettings.standard_break_minutes_per_day ?? 0,
			standard_breaks: (orgSettings.standard_breaks as any) ?? [],
		} : null;

		// If ÄTA is selected and hours is provided, this is a pure ÄTA entry - create single entry
		if (data.ata_id && (data as any).hours) {
			const workDurationMin = Math.round((data as any).hours * 60);
			
			const { data: entry, error: insertError } = await supabase
				.from('time_entries')
				.insert({
					org_id: membership.org_id,
					user_id: user.id,
					project_id: data.project_id,
					phase_id: data.phase_id,
					work_order_id: data.work_order_id ?? null,
					task_label: data.task_label,
					start_at: data.start_at,
					stop_at: data.stop_at,
					duration_min: workDurationMin,
					notes: data.notes,
					billing_type: data.billing_type,
					fixed_block_id: data.fixed_block_id ?? null,
					ata_id: data.ata_id,
					status: 'draft',
				})
				.select('*')
				.single();

			if (insertError) {
				console.error('Error creating ÄTA time entry:', insertError);
				return NextResponse.json({ error: insertError.message }, { status: 500 });
			}

			return NextResponse.json({ entry }, { status: 201 });
		}

		// If ÄTA is selected with ata_minutes, create TWO separate entries: main project + ÄTA
		if (data.ata_id && (data as any).ata_minutes && data.stop_at && data.start_at) {
			const ataMinutes = (data as any).ata_minutes;
			const totalMinutes = Math.floor(
				(new Date(data.stop_at).getTime() - new Date(data.start_at).getTime()) / (1000 * 60)
			);

			// Calculate total work time (after break deduction)
			const totalWorkMin = calculateWorkMinutes(
				data.start_at,
				data.stop_at,
				totalMinutes,
				orgBreakSettings
			);

			// Main project entry: total work time minus ÄTA time
			const mainProjectDurationMin = Math.max(0, totalWorkMin - ataMinutes);

			// ÄTA entry: use the specified ÄTA minutes
			const ataWorkMin = Math.round(ataMinutes);

			// Insert entries sequentially to avoid trigger conflicts and timeout
			// First insert main project entry (no select to save time)
			const mainResult = await supabase
				.from('time_entries')
				.insert({
					org_id: membership.org_id,
					user_id: user.id,
					project_id: data.project_id,
					phase_id: data.phase_id,
					work_order_id: data.work_order_id ?? null,
					task_label: data.task_label,
					start_at: data.start_at,
					stop_at: data.stop_at,
					duration_min: mainProjectDurationMin,
					notes: data.notes,
					billing_type: data.billing_type,
					fixed_block_id: data.fixed_block_id ?? null,
					ata_id: null,
					status: 'draft',
				});

			if (mainResult.error) {
				console.error('Error creating main project time entry:', mainResult.error);
				return NextResponse.json({ error: mainResult.error.message }, { status: 500 });
			}

			// Then insert ÄTA entry (after main entry completes to avoid trigger conflicts)
			const ataResult = await supabase
				.from('time_entries')
				.insert({
					org_id: membership.org_id,
					user_id: user.id,
					project_id: data.project_id,
					phase_id: data.phase_id,
					work_order_id: data.work_order_id ?? null,
					task_label: data.task_label,
					start_at: data.start_at,
					stop_at: data.stop_at,
					duration_min: ataWorkMin,
					notes: data.notes,
					billing_type: data.billing_type,
					fixed_block_id: data.fixed_block_id ?? null,
					ata_id: data.ata_id,
					status: 'draft',
				});

			if (ataResult.error) {
				console.error('Error creating ÄTA time entry:', ataResult.error);
				// Note: Can't easily clean up main entry without ID, but RLS should prevent orphaned entries
				return NextResponse.json({ error: ataResult.error.message }, { status: 500 });
			}

			return NextResponse.json({ 
				message: 'Tidrapport och ÄTA-post skapade'
			}, { status: 201 });
		}

		// Regular entry (no ÄTA) - calculate work time after break deduction
		let workDurationMin: number | null = null;
		if (data.stop_at && data.start_at) {
			const totalMinutes = Math.floor(
				(new Date(data.stop_at).getTime() - new Date(data.start_at).getTime()) / (1000 * 60)
			);

			workDurationMin = calculateWorkMinutes(
				data.start_at,
				data.stop_at,
				totalMinutes,
				orgBreakSettings
			);
		}

		// EPIC 26: Insert time entry without JOINs for maximum speed
		// Client already has project/phase data cached, no need to fetch it again
		const { data: entry, error: insertError } = await supabase
			.from('time_entries')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				project_id: data.project_id,
				phase_id: data.phase_id,
				work_order_id: data.work_order_id ?? null,
				task_label: data.task_label,
				start_at: data.start_at,
				stop_at: data.stop_at,
				duration_min: workDurationMin, // Work time (after break deduction) - the ONE time value
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
			// Get project name for notification
			const { data: project } = await supabase
				.from('projects')
				.select('name')
				.eq('id', entry.project_id)
				.single();

			sendTeamCheckInNotification({
				userId: user.id,
				userName: user.user_metadata?.full_name || user.email || 'Unknown',
				projectId: entry.project_id,
				projectName: project?.name || 'Okänt projekt',
				action: entry.stop_at ? 'check_out' : 'check_in',
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

