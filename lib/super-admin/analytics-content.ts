/**
 * Content Analytics
 * 
 * Track growth of content entities (time entries, materials, projects, etc.)
 */

import { createClient } from '@/lib/supabase/server';
import type { ContentMetrics } from './analytics-types';

/**
 * Get content growth metrics
 * Shows how much content is being created
 */
export async function getContentMetrics(): Promise<ContentMetrics[]> {
	const supabase = await createClient();

	try {
		const metrics: ContentMetrics[] = [];

		// Get date ranges
		const now = new Date();
		const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
		const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
		const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

		// Get total users for average calculation
		const { count: totalUsers } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true });

		const users = totalUsers || 1;

		// Time Entries - use created_at instead of date
		const { count: totalTimeEntries } = await supabase
			.from('time_entries')
			.select('id', { count: 'exact', head: true });

		const { count: timeEntriesThisMonth } = await supabase
			.from('time_entries')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: timeEntriesLastMonth } = await supabase
			.from('time_entries')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const timeGrowth = timeEntriesLastMonth
			? ((timeEntriesThisMonth || 0) - timeEntriesLastMonth) / timeEntriesLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'time_entries',
			total_count: totalTimeEntries || 0,
			count_this_month: timeEntriesThisMonth || 0,
			count_last_month: timeEntriesLastMonth || 0,
			growth_rate: timeGrowth,
			average_per_user: (totalTimeEntries || 0) / users,
		});

		// Materials - use created_at instead of date
		const { count: totalMaterials } = await supabase
			.from('materials')
			.select('id', { count: 'exact', head: true });

		const { count: materialsThisMonth } = await supabase
			.from('materials')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: materialsLastMonth } = await supabase
			.from('materials')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const materialGrowth = materialsLastMonth
			? ((materialsThisMonth || 0) - materialsLastMonth) / materialsLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'materials',
			total_count: totalMaterials || 0,
			count_this_month: materialsThisMonth || 0,
			count_last_month: materialsLastMonth || 0,
			growth_rate: materialGrowth,
			average_per_user: (totalMaterials || 0) / users,
		});

		// Expenses - use created_at instead of date
		const { count: totalExpenses } = await supabase
			.from('expenses')
			.select('id', { count: 'exact', head: true });

		const { count: expensesThisMonth } = await supabase
			.from('expenses')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: expensesLastMonth } = await supabase
			.from('expenses')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const expenseGrowth = expensesLastMonth
			? ((expensesThisMonth || 0) - expensesLastMonth) / expensesLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'expenses',
			total_count: totalExpenses || 0,
			count_this_month: expensesThisMonth || 0,
			count_last_month: expensesLastMonth || 0,
			growth_rate: expenseGrowth,
			average_per_user: (totalExpenses || 0) / users,
		});

		// Projects
		const { count: totalProjects } = await supabase
			.from('projects')
			.select('id', { count: 'exact', head: true });

		const { count: projectsThisMonth } = await supabase
			.from('projects')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: projectsLastMonth } = await supabase
			.from('projects')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const projectGrowth = projectsLastMonth
			? ((projectsThisMonth || 0) - projectsLastMonth) / projectsLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'projects',
			total_count: totalProjects || 0,
			count_this_month: projectsThisMonth || 0,
			count_last_month: projectsLastMonth || 0,
			growth_rate: projectGrowth,
			average_per_user: (totalProjects || 0) / users,
		});

		// ÄTA
		const { count: totalAta } = await supabase
			.from('ata')
			.select('id', { count: 'exact', head: true });

		const { count: ataThisMonth } = await supabase
			.from('ata')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: ataLastMonth } = await supabase
			.from('ata')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const ataGrowth = ataLastMonth
			? ((ataThisMonth || 0) - ataLastMonth) / ataLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'ata',
			total_count: totalAta || 0,
			count_this_month: ataThisMonth || 0,
			count_last_month: ataLastMonth || 0,
			growth_rate: ataGrowth,
			average_per_user: (totalAta || 0) / users,
		});

		// Diary - use created_at instead of date
		const { count: totalDiary } = await supabase
			.from('diary_entries')
			.select('id', { count: 'exact', head: true });

		const { count: diaryThisMonth } = await supabase
			.from('diary_entries')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', thisMonthStart);

		const { count: diaryLastMonth } = await supabase
			.from('diary_entries')
			.select('id', { count: 'exact', head: true })
			.gte('created_at', lastMonthStart)
			.lte('created_at', lastMonthEnd);

		const diaryGrowth = diaryLastMonth
			? ((diaryThisMonth || 0) - diaryLastMonth) / diaryLastMonth * 100
			: 0;

		metrics.push({
			entity_type: 'diary',
			total_count: totalDiary || 0,
			count_this_month: diaryThisMonth || 0,
			count_last_month: diaryLastMonth || 0,
			growth_rate: diaryGrowth,
			average_per_user: (totalDiary || 0) / users,
		});

		return metrics;
	} catch (error) {
		console.error('Error fetching content metrics:', error);
		return [];
	}
}

/**
 * Get content growth over time
 * Returns time series data for charting
 */
export async function getContentGrowthTrend(
	entityType: 'time_entries' | 'materials' | 'expenses' | 'projects',
	days: number = 30
): Promise<{ date: string; count: number }[]> {
	const supabase = await createClient();

	try {
		const trend: { date: string; count: number }[] = [];

		// Map entity type to table
		const tableMap = {
			time_entries: 'time_entries',
			materials: 'materials',
			expenses: 'expenses',
			projects: 'projects',
		};

		const table = tableMap[entityType];
		const dateField = entityType === 'projects' ? 'created_at' : 'date';

		// For each day, count entities created
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];

			const { count } = await supabase
				.from(table)
				.select('id', { count: 'exact', head: true })
				.gte(dateField, dateStr)
				.lt(dateField, new Date(date.getTime() + 86400000).toISOString().split('T')[0]);

			trend.push({
				date: dateStr,
				count: count || 0,
			});
		}

		return trend;
	} catch (error) {
		console.error('Error fetching content growth trend:', error);
		return [];
	}
}

