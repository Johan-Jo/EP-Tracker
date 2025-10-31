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
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { data: _activeToday } = await supabase.rpc('get_active_users_on_date', {
				target_date: dateStr,
			}).single();

			// WAU: Users active in the past 7 days
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _weekAgo = new Date(date);
			_weekAgo.setDate(_weekAgo.getDate() - 7);

			// MAU: Users active in the past 30 days
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _monthAgo = new Date(date);
			_monthAgo.setDate(_monthAgo.getDate() - 30);

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
 */
export async function getCurrentEngagement(): Promise<{
	dau: number;
	wau: number;
	mau: number;
}> {
	const supabase = await createClient();

	try {
		const today = new Date().toISOString().split('T')[0];
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const weekAgoStr = weekAgo.toISOString().split('T')[0];
		const monthAgo = new Date();
		monthAgo.setDate(monthAgo.getDate() - 30);
		const monthAgoStr = monthAgo.toISOString().split('T')[0];

		// Count unique users who created time entries today (DAU)
		const { data: dauData } = await supabase
			.from('time_entries')
			.select('user_id')
			.gte('date', today)
			.lte('date', today);

		const dau = new Set((dauData || []).map((t: { user_id: string }) => t.user_id)).size;

		// Count unique users who created time entries in past 7 days (WAU)
		const { data: wauData } = await supabase
			.from('time_entries')
			.select('user_id')
			.gte('date', weekAgoStr);

		const wau = new Set((wauData || []).map((t: { user_id: string }) => t.user_id)).size;

		// Count unique users who created time entries in past 30 days (MAU)
		const { data: mauData } = await supabase
			.from('time_entries')
			.select('user_id')
			.gte('date', monthAgoStr);

		const mau = new Set((mauData || []).map((t: { user_id: string }) => t.user_id)).size;

		return { dau, wau, mau };
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

