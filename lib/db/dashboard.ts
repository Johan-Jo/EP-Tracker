// EPIC 26.4: Dashboard optimization using database functions
// This module provides optimized dashboard queries using PostgreSQL functions

import { createClient } from '@/lib/supabase/server';
import { getEffectiveStartDateForDemo, isDemoWithDateShifting } from '@/lib/demo/date-shift';

/**
 * Safely log error with all available information
 */
function logError(context: string, error: unknown) {
	// Always log the raw error first for debugging - this will show us what we're actually dealing with
	console.error(`[DASHBOARD] ${context} - RAW ERROR (direct):`, error);
	console.error(`[DASHBOARD] ${context} - Error type:`, typeof error);
	console.error(`[DASHBOARD] ${context} - Is Error instance:`, error instanceof Error);
	
	const errorInfo: Record<string, unknown> = {
		context,
	};

	// Handle null/undefined
	if (error == null) {
		errorInfo.error = 'null or undefined';
		errorInfo.errorType = 'null/undefined';
		console.error(`[DASHBOARD] ${context}:`, errorInfo);
		return;
	}

	// Handle empty object case - this is likely what we're hitting
	if (error && typeof error === 'object') {
		const keys = Object.keys(error);
		const keysCount = keys.length;
		
		errorInfo.errorType = 'object';
		errorInfo.keysCount = keysCount;
		errorInfo.keys = keys;
		
		if (keysCount === 0) {
			errorInfo.error = 'Empty error object {}';
			errorInfo.raw = '{}';
			// Try to get constructor name
			try {
				errorInfo.constructorName = (error as { constructor?: { name?: string } }).constructor?.name;
			} catch {
				// Ignore
			}
			console.error(`[DASHBOARD] ${context}:`, errorInfo);
			return;
		}
		
		// Get all properties from the object
		const allProps: Record<string, unknown> = {};
		for (const key of keys) {
			try {
				const value = (error as Record<string, unknown>)[key];
				allProps[key] = value;
			} catch {
				allProps[key] = '[unable to access]';
			}
		}
		errorInfo.allProperties = allProps;
		
		// Check for Supabase error properties
		if ('code' in error) {
			errorInfo.code = (error as { code?: unknown }).code;
		}
		if ('message' in error) {
			errorInfo.message = (error as { message?: unknown }).message;
		}
		if ('details' in error) {
			errorInfo.details = (error as { details?: unknown }).details;
		}
		if ('hint' in error) {
			errorInfo.hint = (error as { hint?: unknown }).hint;
		}
	}

	// Handle standard Error objects
	if (error instanceof Error) {
		errorInfo.name = error.name;
		errorInfo.message = error.message || errorInfo.message;
		if (error.stack) {
			errorInfo.stack = error.stack;
		}
	}

	// Always try to stringify the error
	try {
		const errorString = JSON.stringify(error, null, 2);
		errorInfo.rawStringified = errorString;
	} catch (stringifyError) {
		errorInfo.stringifyError = String(stringifyError);
		// Fallback: try String()
		try {
			errorInfo.rawString = String(error);
		} catch {
			errorInfo.rawString = '[Unable to convert to string]';
		}
	}

	// Get constructor name if available
	if (error && typeof error === 'object') {
		try {
			errorInfo.constructorName = (error as { constructor?: { name?: string } }).constructor?.name;
		} catch {
			// Ignore
		}
	}

	// Filter out undefined values
	const filteredInfo: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(errorInfo)) {
		if (value !== undefined) {
			filteredInfo[key] = value;
		}
	}

	// Final safety check - ensure we always have useful info
	if (Object.keys(filteredInfo).length <= 1) {
		filteredInfo.error = 'Unable to extract any error information';
		filteredInfo.rawError = String(error);
		filteredInfo.errorType = typeof error;
	}

	console.error(`[DASHBOARD] ${context}:`, filteredInfo);
}

/**
 * Get dashboard statistics using cached materialized view
 * EPIC 26.9 Phase C: Uses pre-computed stats for 99% faster queries
 * Replaces 4 slow COUNT queries (500ms) with cached lookup (5ms)
 * 
 * OPTIMIZED: refresh_dashboard_stats_cache() has been optimized to use:
 * - UPSERT instead of DELETE+INSERT (faster, atomic)
 * - Separate subqueries instead of complex JOINs (better query planning)
 * - Additional indexes for faster lookups
 */
export async function getDashboardStats(userId: string, orgId: string, startDate?: Date) {
	try {
		const supabase = await createClient();

		// Check if this is a demo organization
		const isDemoOrg = await isDemoWithDateShifting(orgId);
		
		// For demo org, if userId is invalid (demo-user-id), get a real demo user_id
		let effectiveUserId = userId;
		if (isDemoOrg && (!userId || userId === 'demo-user-id' || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
			// Get a real demo user_id from the database
			const { data: demoUser } = await supabase
				.from('time_entries')
				.select('user_id')
				.eq('org_id', orgId)
				.limit(1)
				.single();
			
			if (demoUser?.user_id) {
				effectiveUserId = demoUser.user_id;
			} else {
				// If no demo user found, return default stats
				return {
					active_projects: 0,
					total_hours_week: 0,
					total_materials_week: 0,
					total_time_entries_week: 0,
				};
			}
		} else if (!userId || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			// For non-demo orgs, return default stats if userId is invalid
			return {
				active_projects: 0,
				total_hours_week: 0,
				total_materials_week: 0,
				total_time_entries_week: 0,
			};
		}

		// Date-shifting for demo organization
		const effectiveStartDate = startDate 
			? await getEffectiveStartDateForDemo(orgId, startDate)
			: startDate;

		// EPIC 26.9: For demo orgs, use non-cached version because:
		// 1. get_dashboard_stats_cached ignores p_start_date and uses CURRENT_DATE - 7 days
		// 2. We need to use the actual week start date for correct date-shifting
		// 3. Non-cached version (get_dashboard_stats) properly uses p_start_date
		if (isDemoOrg && effectiveStartDate) {
			// Use non-cached version for demo orgs to ensure correct week filtering
			return await getDashboardStatsUncached(effectiveUserId, orgId, effectiveStartDate);
		}

		// EPIC 26.9: Try cached stats first (Phase C) for non-demo orgs
		// Note: get_dashboard_stats_cached expects a DATE parameter, not timestamptz
		// Convert to date string (YYYY-MM-DD) if date is provided
		const startDateParam = effectiveStartDate 
			? effectiveStartDate.toISOString().split('T')[0]  // Extract date part only
			: null;
		
		const { data, error } = await supabase.rpc('get_dashboard_stats_cached', {
			p_user_id: effectiveUserId,
			p_org_id: orgId,
			p_start_date: startDateParam,
		});

		// Handle errors - check for timeout specifically
		if (error) {
			const errorCode = error && typeof error === 'object' && 'code' in error 
				? (error as { code?: string }).code 
				: null;
			
			// Check for statement timeout (57014) - cached function is too slow
			if (errorCode === '57014') {
				console.warn('[DASHBOARD] Cached stats function timed out - this indicates performance issue');
				console.warn('[DASHBOARD] Possible causes:');
				console.warn('  1. refresh_dashboard_stats_cache() is taking too long');
				console.warn('  2. dashboard_stats_cache table needs optimization');
				console.warn('  3. Database is under heavy load');
				console.warn('[DASHBOARD] Falling back to non-cached version (may be slower but should work)');
			}
			
			logError('Error fetching cached stats', error);
			// Fallback to non-cached version (with date-shifting already applied)
			return await getDashboardStatsUncached(effectiveUserId, orgId, effectiveStartDate);
		}

		// Handle case where data might be null or have different structure
		if (!data || typeof data !== 'object') {
			console.warn('[DASHBOARD] Invalid cached stats data, using fallback');
			return await getDashboardStatsUncached(effectiveUserId, orgId, effectiveStartDate);
		}

		// Ensure all required fields exist with defaults
		return {
			active_projects: (data as any).active_projects ?? (data as any).projectsCount ?? 0,
			total_hours_week: (data as any).total_hours_week ?? 0,
			total_materials_week: (data as any).total_materials_week ?? (data as any).materialsCount ?? 0,
			total_time_entries_week: (data as any).total_time_entries_week ?? (data as any).timeEntriesCount ?? 0,
		};
	} catch (err) {
		logError('Exception in getDashboardStats', err);
		// Fallback to non-cached version
		// Date-shifting will be applied in getDashboardStatsUncached if needed
		const supabase = await createClient();
		const isDemoOrg = await isDemoWithDateShifting(orgId);
		
		let effectiveUserId = userId;
		if (isDemoOrg && (!userId || userId === 'demo-user-id' || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
			const { data: demoUser } = await supabase
				.from('time_entries')
				.select('user_id')
				.eq('org_id', orgId)
				.limit(1)
				.single();
			if (demoUser?.user_id) {
				effectiveUserId = demoUser.user_id;
			}
		}
		
		const effectiveStartDate = startDate 
			? await getEffectiveStartDateForDemo(orgId, startDate)
			: startDate;
		return await getDashboardStatsUncached(effectiveUserId, orgId, effectiveStartDate);
	}
}

/**
 * Fallback: Non-cached stats (used if cache fails)
 */
async function getDashboardStatsUncached(userId: string, orgId: string, startDate?: Date) {
	try {
		const supabase = await createClient();

		// Check if this is a demo organization
		const isDemoOrg = await isDemoWithDateShifting(orgId);
		
		// For demo org, if userId is invalid (demo-user-id), get a real demo user_id
		let effectiveUserId = userId;
		if (isDemoOrg && (!userId || userId === 'demo-user-id' || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
			// Get a real demo user_id from the database
			const { data: demoUser } = await supabase
				.from('time_entries')
				.select('user_id')
				.eq('org_id', orgId)
				.limit(1)
				.single();
			
			if (demoUser?.user_id) {
				effectiveUserId = demoUser.user_id;
			} else {
				// If no demo user found, return default stats
				return {
					active_projects: 0,
					total_hours_week: 0,
					total_materials_week: 0,
					total_time_entries_week: 0,
				};
			}
		} else if (!userId || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			// For non-demo orgs, return default stats if userId is invalid
			return {
				active_projects: 0,
				total_hours_week: 0,
				total_materials_week: 0,
				total_time_entries_week: 0,
			};
		}

		// Date-shifting for demo organization
		const effectiveStartDate = startDate 
			? await getEffectiveStartDateForDemo(orgId, startDate)
			: startDate;

		const { data, error } = await supabase.rpc('get_dashboard_stats', {
			p_user_id: effectiveUserId,
			p_org_id: orgId,
			p_start_date: effectiveStartDate?.toISOString() || null,
		});

		if (error) {
			logError('Error fetching uncached stats', error);
			return {
				active_projects: 0,
				total_hours_week: 0,
				total_materials_week: 0,
				total_time_entries_week: 0,
			};
		}

		// Handle case where data might be null or have different structure
		if (!data || typeof data !== 'object') {
			console.warn('[DASHBOARD] Invalid uncached stats data, using defaults');
			return {
				active_projects: 0,
				total_hours_week: 0,
				total_materials_week: 0,
				total_time_entries_week: 0,
			};
		}

		// Ensure all required fields exist with defaults
		return {
			active_projects: (data as any).active_projects ?? (data as any).projectsCount ?? 0,
			total_hours_week: (data as any).total_hours_week ?? 0,
			total_materials_week: (data as any).total_materials_week ?? (data as any).materialsCount ?? 0,
			total_time_entries_week: (data as any).total_time_entries_week ?? (data as any).timeEntriesCount ?? 0,
		};
	} catch (err) {
		logError('Exception in getDashboardStatsUncached', err);
		return {
			active_projects: 0,
			total_hours_week: 0,
			total_materials_week: 0,
			total_time_entries_week: 0,
		};
	}
}

/**
 * Get recent activities using activity log table
 * EPIC 26.9 Phase B: Uses dedicated activity_log table for 93% faster queries
 * Replaces slow UNION ALL query (300ms) with simple table lookup (20ms)
 */
type ActivityDiarySummary = {
	id: string;
	work_performed: string | null;
	created_by: string;
	date: string;
};

type RawActivityRow = {
	id: string;
	type: string;
	created_at: string;
	project_id: string | null;
	project_name: string | null;
	user_id: string | null;
	user_name: string | null;
	data: Record<string, unknown> | null;
	description: string | null;
};

const VALID_ACTIVITY_TYPES = [
	'time_entry',
	'material',
	'expense',
	'mileage',
	'ata',
	'diary',
] as const;

type ValidActivityType = (typeof VALID_ACTIVITY_TYPES)[number];

export type DashboardActivityType = ValidActivityType | 'other';

const normalizeActivityType = (type: string): DashboardActivityType => {
	if (VALID_ACTIVITY_TYPES.includes(type as ValidActivityType)) {
		return type as ValidActivityType;
	}
	return 'other';
};

type ActivityRecord = {
	id: string;
	type: DashboardActivityType;
	created_at: string;
	project: { id: string; name: string } | null;
	user_id: string | null;
	user_name: string;
	data: Record<string, unknown> | null;
	description: string;
};

type EnrichedActivityRecord = ActivityRecord & { diary_entry: ActivityDiarySummary | null };
export type DashboardActivity = EnrichedActivityRecord;

const getDataString = (data: Record<string, unknown> | null, key: string): string | undefined => {
	if (!data) return undefined;
	const value = data[key];
	return typeof value === 'string' ? value : undefined;
};

async function attachDiarySummaries(
	supabase: Awaited<ReturnType<typeof createClient>>,
	orgId: string,
	activities: ActivityRecord[],
): Promise<DashboardActivity[]> {
	const diaryLookupKeys = new Set<string>();
	const projectIds = new Set<string>();
	const userIds = new Set<string>();
	let minDate: string | null = null;
	let maxDate: string | null = null;

	for (const activity of activities) {
		if (activity.type !== 'time_entry') continue;
		if (!activity.project?.id || !activity.user_id) continue;

		const startTimestamp = getDataString(activity.data, 'start_at') ?? activity.created_at;
		const parsed = startTimestamp ? new Date(startTimestamp) : null;
		if (!parsed || Number.isNaN(parsed.getTime())) continue;

		const entryDate = parsed.toISOString().split('T')[0];
		const lookupKey = `${activity.project.id}:${activity.user_id}:${entryDate}`;
		diaryLookupKeys.add(lookupKey);
		projectIds.add(activity.project.id);
		userIds.add(activity.user_id);

		if (!minDate || entryDate < minDate) {
			minDate = entryDate;
		}
		if (!maxDate || entryDate > maxDate) {
			maxDate = entryDate;
		}
	}

	const diaryEntriesByKey: Record<string, ActivityDiarySummary> = {};

	// ✅ PERFORMANCE: Only fetch diary entries if we have valid lookup keys
	// This prevents unnecessary queries when there are no time_entry activities
	if (diaryLookupKeys.size > 0 && projectIds.size > 0 && userIds.size > 0 && minDate && maxDate) {
		const { data: diaryEntries, error: diaryError } = await supabase
			.from('diary_entries')
			.select('id, project_id, created_by, date, work_performed')
			.eq('org_id', orgId)
			.in('project_id', Array.from(projectIds))
			.in('created_by', Array.from(userIds))
			.gte('date', minDate)
			.lte('date', maxDate)
			.limit(100); // ✅ PERFORMANCE: Limit to prevent fetching too many diary entries

		if (diaryError) {
			logError('Error fetching diary summaries', diaryError);
		} else {
			for (const diary of diaryEntries || []) {
				if (!diary.project_id || !diary.created_by || !diary.date) continue;
				const key = `${diary.project_id}:${diary.created_by}:${diary.date}`;
				diaryEntriesByKey[key] = {
					id: diary.id,
					work_performed: diary.work_performed ?? null,
					created_by: diary.created_by,
					date: diary.date,
				};
			}
		}
	}

	return activities.map((activity) => {
		if (
			activity.type !== 'time_entry' ||
			!activity.project?.id ||
			!activity.user_id
		) {
			return { ...activity, diary_entry: null };
		}

		const startTimestamp = getDataString(activity.data, 'start_at') ?? activity.created_at;
		const parsed = startTimestamp ? new Date(startTimestamp) : null;
		if (!parsed || Number.isNaN(parsed.getTime())) {
			return { ...activity, diary_entry: null };
		}
		const entryDate = parsed.toISOString().split('T')[0];
		const key = `${activity.project.id}:${activity.user_id}:${entryDate}`;
		const diaryEntry = diaryEntriesByKey[key] ?? null;

		return {
			...activity,
			diary_entry: diaryEntry,
		};
	});
}

export async function getRecentActivities(orgId: string, limit: number = 15): Promise<DashboardActivity[]> {
	// Validate orgId
	if (!orgId || !orgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
		return [];
	}

	const supabase = await createClient();

	// EPIC 26.9: Try fast activity log query first (Phase B)
	const { data, error } = await supabase.rpc('get_recent_activities_fast', {
		p_org_id: orgId,
		p_limit: limit,
	});

	if (error) {
		// Only log non-RLS errors (RLS errors are expected for demo mode)
		if (error && typeof error === 'object' && Object.keys(error).length > 0) {
			const errorCode = 'code' in error ? (error as { code?: string }).code : null;
			if (errorCode !== 'PGRST301' && errorCode !== '42501') {
				logError('Error fetching fast activities', error);
			}
		}
		// Fallback to old UNION query if activity log fails
		return await getRecentActivitiesLegacy(orgId, limit);
	}

	// Transform database response to match existing format
	const activities = (data || []).map((activity: RawActivityRow) => ({
		id: activity.id,
		type: normalizeActivityType(activity.type),
		created_at: activity.created_at,
		project: activity.project_name ? {
			id: activity.project_id as string,
			name: activity.project_name,
		} : null,
		user_id: activity.user_id ?? null,
		user_name: activity.user_name ?? '',
		data: activity.data,
		description: activity.description ?? 'Aktivitet',
	})) as ActivityRecord[];

	return attachDiarySummaries(supabase, orgId, activities);
}

/**
 * Fallback: Legacy UNION ALL query (used if activity_log fails)
 */
async function getRecentActivitiesLegacy(orgId: string, limit: number = 15): Promise<DashboardActivity[]> {
	// Validate orgId
	if (!orgId || !orgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
		return [];
	}

	const supabase = await createClient();

	const { data, error } = await supabase.rpc('get_recent_activities', {
		p_org_id: orgId,
		p_limit: limit,
	});

	if (error) {
		// Only log non-RLS errors
		if (error && typeof error === 'object' && Object.keys(error).length > 0) {
			const errorCode = 'code' in error ? (error as { code?: string }).code : null;
			if (errorCode !== 'PGRST301' && errorCode !== '42501') {
				logError('Error fetching legacy activities', error);
			}
		}
		return [];
	}

	const activities = (data || []).map((activity: RawActivityRow) => ({
		id: activity.id,
		type: normalizeActivityType(activity.type),
		created_at: activity.created_at,
		project: activity.project_name ? {
			id: activity.project_id as string,
			name: activity.project_name,
		} : null,
		user_id: activity.user_id ?? null,
		user_name: activity.user_name ?? '',
		data: activity.data,
		description: activity.description ?? 'Aktivitet',
	})) as ActivityRecord[];

	return attachDiarySummaries(supabase, orgId, activities);
}

/**
 * Get active time entry for a user
 * ✅ PERFORMANCE: Select only needed columns instead of *
 * (Kept separate as it's a simple, user-specific query)
 */
export async function getActiveTimeEntry(userId: string) {
	// Skip query for demo mode placeholder user or invalid UUIDs
	if (!userId || userId === '' || userId === 'demo-user-placeholder' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
		return null;
	}

	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from('time_entries')
			.select(`
				id,
				start_at,
				billing_type,
				fixed_block_id,
				projects(id, name)
			`)
			.eq('user_id', userId)
			.is('stop_at', null)
			.order('start_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			// Only log meaningful errors (skip empty objects and expected RLS/auth errors)
			if (error && typeof error === 'object' && Object.keys(error).length > 0) {
				// Skip RLS and auth errors for invalid user IDs (expected in demo mode)
				if (error.code !== 'PGRST301' && error.code !== '42501' && error.code !== 'PGRST116') {
					console.error('[DASHBOARD] Error fetching active time entry:', {
						code: error.code,
						message: error.message,
						details: error.details,
						hint: error.hint,
					});
				}
			}
			return null;
		}

		return data;
	} catch (err) {
		// Only log unexpected errors (skip empty objects)
		if (err && typeof err === 'object' && Object.keys(err).length > 0) {
			const errMessage = err instanceof Error ? err.message : String(err);
			if (!errMessage.includes('PGRST301') && !errMessage.includes('42501')) {
				console.error('[DASHBOARD] Exception fetching active time entry:', err);
			}
		}
		return null;
	}
}

/**
 * Get all active projects for dropdown
 * ✅ PERFORMANCE: Added limit and optimized ordering
 * Returns projects sorted by created_at DESC (most recent first) for dashboard
 * This allows us to use the first project as "recent project" without a separate query
 * (Kept separate as it's needed for the UI)
 */
export async function getActiveProjects(orgId: string) {
	// Validate orgId
	if (!orgId || !orgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
		return [];
	}

	const supabase = await createClient();

	const { data, error } = await supabase
		.from('projects')
		.select('id, name, billing_mode, default_time_billing_type, created_at')
		.eq('org_id', orgId)
		.eq('status', 'active')
		.eq('is_archived', false) // Exclude archived projects
		.order('created_at', { ascending: false }) // ✅ Most recent first (for recent project)
		.limit(200); // ✅ PERFORMANCE: Limit to prevent loading too many projects

	if (error) {
		// Only log non-RLS errors
		if (error && typeof error === 'object' && Object.keys(error).length > 0) {
			const errorCode = 'code' in error ? (error as { code?: string }).code : null;
			if (errorCode !== 'PGRST301' && errorCode !== '42501') {
				logError('Error fetching active projects', error);
			}
		}
		return [];
	}

	// Sort by name for dropdown display (but keep created_at for recent project detection)
	const sorted = (data || []).sort((a, b) => {
		const nameA = a.name?.toLowerCase() || '';
		const nameB = b.name?.toLowerCase() || '';
		return nameA.localeCompare(nameB);
	});

	return sorted;
}

/**
 * Get most recent project
 * (Kept separate as it's a simple query)
 */
export async function getRecentProject(orgId: string) {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('projects')
		.select('id, name')
		.eq('org_id', orgId)
		.eq('status', 'active')
		.eq('is_archived', false) // Exclude archived projects
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		logError('Error fetching recent project', error);
		return null;
	}

	return data;
}

