/**
 * User Engagement Analytics
 * 
 * Track DAU (Daily Active Users), WAU (Weekly Active Users), MAU (Monthly Active Users)
 */

import { createClient } from '@/lib/supabase/server';
import type { EngagementMetrics } from './analytics-types';

/**
 * Get engagement metrics over time
 * Returns daily data points with DAU/WAU/MAU
 */
export async function getEngagementMetrics(days: number = 30): Promise<EngagementMetrics[]> {
	const supabase = await createClient();

	try {
		const metrics: EngagementMetrics[] = [];
		const today = new Date();

		// For each day in the period
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];

			// DAU: Users active on this day
			// We consider a user "active" if they created any content on that day
			// (Query prepared for future use)
			await supabase.rpc('get_active_users_on_date', {
				target_date: dateStr,
			}).single();

			// WAU/MAU: Calculations would be done here in future implementation

			// Simplified calculation (would need actual queries)
			metrics.push({
				date: dateStr,
				dau: 0, // Would calculate from time_entries, materials, etc. created on this day
				wau: 0, // Would calculate from past 7 days
				mau: 0, // Would calculate from past 30 days
				new_users: 0, // Users created on this day
				returning_users: 0, // Users who were active before and are active today
			});
		}

		return metrics;
	} catch (error) {
		console.error('Error fetching engagement metrics:', error);
		return [];
	}
}

/**
 * Get current DAU/WAU/MAU snapshot
 * Uses activity_log if available, otherwise checks multiple tables
 */
export async function getCurrentEngagement(): Promise<{
	dau: number;
	wau: number;
	mau: number;
}> {
	const supabase = await createClient();

	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString();
		
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		weekAgo.setHours(0, 0, 0, 0);
		const weekAgoStr = weekAgo.toISOString();
		
		const monthAgo = new Date();
		monthAgo.setDate(monthAgo.getDate() - 30);
		monthAgo.setHours(0, 0, 0, 0);
		const monthAgoStr = monthAgo.toISOString();

		// Try activity_log first (most efficient and comprehensive)
		try {
			const { data: dauData } = await supabase
				.from('activity_log')
				.select('user_id')
				.eq('is_deleted', false)
				.gte('created_at', todayStr);

			const { data: wauData } = await supabase
				.from('activity_log')
				.select('user_id')
				.eq('is_deleted', false)
				.gte('created_at', weekAgoStr);

			const { data: mauData } = await supabase
				.from('activity_log')
				.select('user_id')
				.eq('is_deleted', false)
				.gte('created_at', monthAgoStr);

			const dau = new Set((dauData || []).map((a: { user_id: string }) => a.user_id)).size;
			const wau = new Set((wauData || []).map((a: { user_id: string }) => a.user_id)).size;
			const mau = new Set((mauData || []).map((a: { user_id: string }) => a.user_id)).size;

			return { dau, wau, mau };
		} catch (activityLogError) {
			// Fallback: Check multiple tables for activity
			console.log('activity_log not available, using fallback queries');
		}

		// Fallback: Check multiple activity sources
		// Count unique users who created/updated content today (DAU)
		const [dauTimeEntries, dauMaterials, dauExpenses, dauMileage, dauDiary] = await Promise.all([
			supabase.from('time_entries').select('user_id').gte('created_at', todayStr),
			supabase.from('materials').select('user_id').gte('created_at', todayStr),
			supabase.from('expenses').select('user_id').gte('created_at', todayStr),
			supabase.from('mileage').select('user_id').gte('created_at', todayStr),
			supabase.from('diary_entries').select('created_by').gte('created_at', todayStr),
		]);

		const dauUsers = new Set([
			...(dauTimeEntries.data || []).map((t: { user_id: string }) => t.user_id),
			...(dauMaterials.data || []).map((m: { user_id: string }) => m.user_id),
			...(dauExpenses.data || []).map((e: { user_id: string }) => e.user_id),
			...(dauMileage.data || []).map((m: { user_id: string }) => m.user_id),
			...(dauDiary.data || []).map((d: { created_by: string }) => d.created_by),
		]);

		// Count unique users active in past 7 days (WAU)
		const [wauTimeEntries, wauMaterials, wauExpenses, wauMileage, wauDiary] = await Promise.all([
			supabase.from('time_entries').select('user_id').gte('created_at', weekAgoStr),
			supabase.from('materials').select('user_id').gte('created_at', weekAgoStr),
			supabase.from('expenses').select('user_id').gte('created_at', weekAgoStr),
			supabase.from('mileage').select('user_id').gte('created_at', weekAgoStr),
			supabase.from('diary_entries').select('created_by').gte('created_at', weekAgoStr),
		]);

		const wauUsers = new Set([
			...(wauTimeEntries.data || []).map((t: { user_id: string }) => t.user_id),
			...(wauMaterials.data || []).map((m: { user_id: string }) => m.user_id),
			...(wauExpenses.data || []).map((e: { user_id: string }) => e.user_id),
			...(wauMileage.data || []).map((m: { user_id: string }) => m.user_id),
			...(wauDiary.data || []).map((d: { created_by: string }) => d.created_by),
		]);

		// Count unique users active in past 30 days (MAU)
		const [mauTimeEntries, mauMaterials, mauExpenses, mauMileage, mauDiary] = await Promise.all([
			supabase.from('time_entries').select('user_id').gte('created_at', monthAgoStr),
			supabase.from('materials').select('user_id').gte('created_at', monthAgoStr),
			supabase.from('expenses').select('user_id').gte('created_at', monthAgoStr),
			supabase.from('mileage').select('user_id').gte('created_at', monthAgoStr),
			supabase.from('diary_entries').select('created_by').gte('created_at', monthAgoStr),
		]);

		const mauUsers = new Set([
			...(mauTimeEntries.data || []).map((t: { user_id: string }) => t.user_id),
			...(mauMaterials.data || []).map((m: { user_id: string }) => m.user_id),
			...(mauExpenses.data || []).map((e: { user_id: string }) => e.user_id),
			...(mauMileage.data || []).map((m: { user_id: string }) => m.user_id),
			...(mauDiary.data || []).map((d: { created_by: string }) => d.created_by),
		]);

		return {
			dau: dauUsers.size,
			wau: wauUsers.size,
			mau: mauUsers.size,
		};
	} catch (error) {
		console.error('Error fetching current engagement:', error);
		return { dau: 0, wau: 0, mau: 0 };
	}
}

/**
 * Get user activity funnel
 * Shows drop-off at each stage of user journey
 */
export async function getUserActivityFunnel(): Promise<{
	stage: string;
	users: number;
	conversion_rate: number;
}[]> {
	const supabase = await createClient();

	try {
		// Total signed up users
		const { count: totalUsers } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true });

		// Users who created a project
		const { data: projectUsers } = await supabase
			.from('projects')
			.select('created_by');

		const createdProject = new Set((projectUsers || []).map((p: { created_by: string }) => p.created_by)).size;

		// Users who logged time
		const { data: timeUsers } = await supabase
			.from('time_entries')
			.select('user_id');

		const loggedTime = new Set((timeUsers || []).map((t: { user_id: string }) => t.user_id)).size;

		// Users who added materials/expenses
		const { data: materialUsers } = await supabase
			.from('materials')
			.select('user_id');

		const addedMaterials = new Set((materialUsers || []).map((m: { user_id: string }) => m.user_id)).size;

		const total = totalUsers || 1;

		return [
			{
				stage: 'Registrerade användare',
				users: total,
				conversion_rate: 100,
			},
			{
				stage: 'Skapat projekt',
				users: createdProject,
				conversion_rate: (createdProject / total) * 100,
			},
			{
				stage: 'Loggat tid',
				users: loggedTime,
				conversion_rate: (loggedTime / total) * 100,
			},
			{
				stage: 'Lagt till material',
				users: addedMaterials,
				conversion_rate: (addedMaterials / total) * 100,
			},
		];
	} catch (error) {
		console.error('Error fetching user activity funnel:', error);
		return [];
	}
}

