/**
 * Feature Adoption Analytics
 * 
 * Track which features are being used and by how many users/organizations.
 */

import { createClient } from '@/lib/supabase/server';
import type { FeatureAdoption, DateRange } from './analytics-types';

/**
 * Get feature adoption metrics
 * Shows which features are most popular
 */
export async function getFeatureAdoption(filters?: DateRange): Promise<FeatureAdoption[]> {
	const supabase = await createClient();

	const features: FeatureAdoption[] = [];

	try {
		// Get total users for baseline
		const { count: totalUsers } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true });

		const total = totalUsers || 1; // Avoid division by zero

		// Time Entries
		const { data: timeUsers } = await supabase
			.from('time_entries')
			.select('user_id', { count: 'exact' })
			.gte('date', filters?.start_date || '2024-01-01');

		const uniqueTimeUsers = new Set((timeUsers || []).map((t: { user_id: string }) => t.user_id)).size;

		features.push({
			feature_name: 'Tidrapportering',
			total_users: total,
			active_users: uniqueTimeUsers,
			adoption_rate: (uniqueTimeUsers / total) * 100,
			growth_rate: 0, // Calculate from previous period if needed
		});

		// Materials
		const { data: materialUsers } = await supabase
			.from('materials')
			.select('user_id', { count: 'exact' })
			.gte('date', filters?.start_date || '2024-01-01');

		const uniqueMaterialUsers = new Set((materialUsers || []).map((m: { user_id: string }) => m.user_id)).size;

		features.push({
			feature_name: 'Material',
			total_users: total,
			active_users: uniqueMaterialUsers,
			adoption_rate: (uniqueMaterialUsers / total) * 100,
			growth_rate: 0,
		});

		// Expenses
		const { data: expenseUsers } = await supabase
			.from('expenses')
			.select('user_id', { count: 'exact' })
			.gte('date', filters?.start_date || '2024-01-01');

		const uniqueExpenseUsers = new Set((expenseUsers || []).map((e: { user_id: string }) => e.user_id)).size;

		features.push({
			feature_name: 'Utlägg',
			total_users: total,
			active_users: uniqueExpenseUsers,
			adoption_rate: (uniqueExpenseUsers / total) * 100,
			growth_rate: 0,
		});

		// Mileage
		const { data: mileageUsers } = await supabase
			.from('mileage')
			.select('user_id', { count: 'exact' })
			.gte('date', filters?.start_date || '2024-01-01');

		const uniqueMileageUsers = new Set((mileageUsers || []).map((m: { user_id: string }) => m.user_id)).size;

		features.push({
			feature_name: 'Milersättning',
			total_users: total,
			active_users: uniqueMileageUsers,
			adoption_rate: (uniqueMileageUsers / total) * 100,
			growth_rate: 0,
		});

		// ÄTA
		const { data: ataUsers } = await supabase
			.from('ata')
			.select('created_by', { count: 'exact' })
			.gte('created_at', filters?.start_date || '2024-01-01');

		const uniqueAtaUsers = new Set((ataUsers || []).map((a: { created_by: string }) => a.created_by)).size;

		features.push({
			feature_name: 'ÄTA',
			total_users: total,
			active_users: uniqueAtaUsers,
			adoption_rate: (uniqueAtaUsers / total) * 100,
			growth_rate: 0,
		});

		// Diary
		const { data: diaryUsers } = await supabase
			.from('diary_entries')
			.select('user_id', { count: 'exact' })
			.gte('date', filters?.start_date || '2024-01-01');

		const uniqueDiaryUsers = new Set((diaryUsers || []).map((d: { user_id: string }) => d.user_id)).size;

		features.push({
			feature_name: 'Dagbok',
			total_users: total,
			active_users: uniqueDiaryUsers,
			adoption_rate: (uniqueDiaryUsers / total) * 100,
			growth_rate: 0,
		});

		// Checklists
		const { data: checklistUsers } = await supabase
			.from('checklists')
			.select('created_by', { count: 'exact' })
			.gte('created_at', filters?.start_date || '2024-01-01');

		const uniqueChecklistUsers = new Set((checklistUsers || []).map((c: { created_by: string }) => c.created_by)).size;

		features.push({
			feature_name: 'Checklistor',
			total_users: total,
			active_users: uniqueChecklistUsers,
			adoption_rate: (uniqueChecklistUsers / total) * 100,
			growth_rate: 0,
		});

		// Sort by adoption rate
		return features.sort((a, b) => b.adoption_rate - a.adoption_rate);
	} catch (error) {
		console.error('Error fetching feature adoption:', error);
		return [];
	}
}

/**
 * Get feature adoption by plan
 * Compare feature usage across different pricing plans
 */
export async function getFeatureAdoptionByPlan(): Promise<{
	plan: string;
	features: FeatureAdoption[];
}[]> {
	const supabase = await createClient();

	try {
		// Get organizations grouped by plan
		const { data: orgs } = await supabase
			.from('organizations')
			.select(`
				id,
				subscriptions!inner(
					pricing_plans!inner(
						name
					)
				)
			`);

		// Group by plan and calculate adoption
		const planMap = new Map<string, string[]>();

		(orgs || []).forEach((org: any) => {
			const subscription = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions;
			const pricingPlan = subscription?.pricing_plans
				? (Array.isArray(subscription.pricing_plans) ? subscription.pricing_plans[0] : subscription.pricing_plans)
				: null;
			const planName = pricingPlan?.name || 'No Plan';
			if (!planMap.has(planName)) {
				planMap.set(planName, []);
			}
			planMap.getленный(planName)!.push(org.id);
		});

		// For each plan, calculate feature adoption
		const results = [];

		for (const [plan] of planMap.entries()) {
			// This would require more complex queries per plan
			// Simplified version: just return empty for now
			results.push({
				plan,
				features: [],
			});
		}

		return results;
	} catch (error) {
		console.error('Error fetching feature adoption by plan:', error);
		return [];
	}
}

