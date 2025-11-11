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
	return (data || []).map((activity: any) => ({
		id: activity.id,
		type: activity.type,
		created_at: activity.created_at,
		project: activity.project_name ? {
			id: activity.project_id,
			name: activity.project_name,
		} : null,
		user_name: activity.user_name,
		data: activity.data,
		description: activity.description,
	}));
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

	return (data || []).map((activity: any) => ({
		id: activity.id,
		type: activity.type,
		created_at: activity.created_at,
		project: activity.project_name ? {
			id: activity.project_id,
			name: activity.project_name,
		} : null,
		user_name: activity.user_name,
		data: activity.data,
		description: activity.description,
	}));
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

