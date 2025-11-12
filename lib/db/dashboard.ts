// EPIC 26.4: Dashboard optimization using database functions
// This module provides optimized dashboard queries using PostgreSQL functions

import { createClient } from '@/lib/supabase/server';

/**
 * Get dashboard statistics using cached materialized view
 * EPIC 26.9 Phase C: Uses pre-computed stats for 99% faster queries
 * Replaces 4 slow COUNT queries (500ms) with cached lookup (5ms)
 */
export async function getDashboardStats(userId: string, orgId: string, startDate?: Date) {
	const supabase = await createClient();

	// EPIC 26.9: Try cached stats first (Phase C)
	const { data, error } = await supabase.rpc('get_dashboard_stats_cached', {
		p_user_id: userId,
		p_org_id: orgId,
		p_start_date: startDate?.toISOString() || null,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching cached stats:', error);
		// Fallback to non-cached version
		return await getDashboardStatsUncached(userId, orgId, startDate);
	}

	return data as {
		active_projects: number;
		total_hours_week: number;
		total_materials_week: number;
		total_time_entries_week: number;
	};
}

/**
 * Fallback: Non-cached stats (used if cache fails)
 */
async function getDashboardStatsUncached(userId: string, orgId: string, startDate?: Date) {
	const supabase = await createClient();

	const { data, error } = await supabase.rpc('get_dashboard_stats', {
		p_user_id: userId,
		p_org_id: orgId,
		p_start_date: startDate?.toISOString() || null,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching uncached stats:', error);
		return {
			active_projects: 0,
			total_hours_week: 0,
			total_materials_week: 0,
			total_time_entries_week: 0,
		};
	}

	return data as {
		active_projects: number;
		total_hours_week: number;
		total_materials_week: number;
		total_time_entries_week: number;
	};
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

type ActivityRecord = {
	id: string;
	type: string;
	created_at: string;
	project: { id: string; name: string } | null;
	user_id: string | null;
	user_name: string;
	data: Record<string, unknown> | null;
	description: string;
};

type EnrichedActivityRecord = ActivityRecord & { diary_entry: ActivityDiarySummary | null };

const getDataString = (data: Record<string, unknown> | null, key: string): string | undefined => {
	if (!data) return undefined;
	const value = data[key];
	return typeof value === 'string' ? value : undefined;
};

async function attachDiarySummaries(
	supabase: Awaited<ReturnType<typeof createClient>>,
	orgId: string,
	activities: ActivityRecord[],
): Promise<EnrichedActivityRecord[]> {
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

	if (diaryLookupKeys.size > 0 && projectIds.size > 0 && userIds.size > 0 && minDate && maxDate) {
		const { data: diaryEntries, error: diaryError } = await supabase
			.from('diary_entries')
			.select('id, project_id, created_by, date, work_performed')
			.eq('org_id', orgId)
			.in('project_id', Array.from(projectIds))
			.in('created_by', Array.from(userIds))
			.gte('date', minDate)
			.lte('date', maxDate);

		if (diaryError) {
			console.error('[DASHBOARD] Error fetching diary summaries:', diaryError);
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

export async function getRecentActivities(orgId: string, limit: number = 15) {
	const supabase = await createClient();

	// EPIC 26.9: Try fast activity log query first (Phase B)
	const { data, error } = await supabase.rpc('get_recent_activities_fast', {
		p_org_id: orgId,
		p_limit: limit,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching fast activities:', error);
		// Fallback to old UNION query if activity log fails
		return await getRecentActivitiesLegacy(orgId, limit);
	}

	// Transform database response to match existing format
	const activities = (data || []).map((activity: RawActivityRow) => ({
		id: activity.id,
		type: activity.type,
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
async function getRecentActivitiesLegacy(orgId: string, limit: number = 15) {
	const supabase = await createClient();

	const { data, error } = await supabase.rpc('get_recent_activities', {
		p_org_id: orgId,
		p_limit: limit,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching legacy activities:', error);
		return [];
	}

	const activities = (data || []).map((activity: RawActivityRow) => ({
		id: activity.id,
		type: activity.type,
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
 * (Kept separate as it's a simple, user-specific query)
 */
export async function getActiveTimeEntry(userId: string) {
	const supabase = await createClient();

	try {
		const { data, error } = await supabase
			.from('time_entries')
			.select('*, projects(id, name)')
			.eq('user_id', userId)
			.is('stop_at', null)
			.order('start_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error('[DASHBOARD] Error fetching active time entry:', {
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
			});
			return null;
		}

		return data;
	} catch (err) {
		console.error('[DASHBOARD] Exception fetching active time entry:', err);
		return null;
	}
}

/**
 * Get all active projects for dropdown
 * (Kept separate as it's needed for the UI)
 */
export async function getActiveProjects(orgId: string) {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('projects')
		.select('id, name, billing_mode, default_time_billing_type')
		.eq('org_id', orgId)
		.eq('status', 'active')
		.order('name', { ascending: true });

	if (error) {
		console.error('[DASHBOARD] Error fetching active projects:', error);
		return [];
	}

	return data || [];
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
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('[DASHBOARD] Error fetching recent project:', error);
		return null;
	}

	return data;
}

