// EPIC 26.4: Dashboard optimization using database functions
// This module provides optimized dashboard queries using PostgreSQL functions

import { createClient } from '@/lib/supabase/server';

/**
 * Get dashboard statistics using the optimized database function
 * Replaces 4 separate count queries with 1 aggregated query
 */
export async function getDashboardStats(userId: string, orgId: string, startDate?: Date) {
	const supabase = await createClient();

	const { data, error } = await supabase.rpc('get_dashboard_stats', {
		p_user_id: userId,
		p_org_id: orgId,
		p_start_date: startDate?.toISOString() || null,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching stats:', error);
		return {
			projectsCount: 0,
			timeEntriesCount: 0,
			materialsCount: 0,
		};
	}

	return data as {
		projectsCount: number;
		timeEntriesCount: number;
		materialsCount: number;
	};
}

/**
 * Get recent activities using the optimized database function
 * Replaces 5 separate activity queries with 1 unified query
 */
export async function getRecentActivities(orgId: string, limit: number = 15) {
	const supabase = await createClient();

	const { data, error } = await supabase.rpc('get_recent_activities', {
		p_org_id: orgId,
		p_limit: limit,
	});

	if (error) {
		console.error('[DASHBOARD] Error fetching activities:', error);
		return [];
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
	}));
}

/**
 * Get active time entry for a user
 * (Kept separate as it's a simple, user-specific query)
 */
export async function getActiveTimeEntry(userId: string) {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('time_entries')
		.select('*, projects(id, name)')
		.eq('user_id', userId)
		.is('stop_at', null)
		.order('start_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('[DASHBOARD] Error fetching active time entry:', error);
		return null;
	}

	return data;
}

/**
 * Get all active projects for dropdown
 * (Kept separate as it's needed for the UI)
 */
export async function getActiveProjects(orgId: string) {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('projects')
		.select('id, name')
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

