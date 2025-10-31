/**
 * Cohort Analysis & Churn Risk
 * 
 * Analyze user retention and identify at-risk organizations.
 */

import { createClient } from '@/lib/supabase/server';
import type { CohortData, ChurnRisk } from './analytics-types';

/**
 * Get cohort retention analysis
 * Groups organizations by signup month and tracks retention
 */
export async function getCohortRetention(): Promise<CohortData[]> {
	const supabase = await createClient();

	try {
		// Get all organizations with their creation date
		const { data: orgs } = await supabase
			.from('organizations')
			.select('id, created_at')
			.order('created_at', { ascending: true });

		if (!orgs || orgs.length === 0) {
			return [];
		}

		// Group by month
		const cohorts = new Map<string, string[]>();

		orgs.forEach((org: { id: string; created_at: string }) => {
			const month = org.created_at.substring(0, 7); // YYYY-MM
			if (!cohorts.has(month)) {
				cohorts.set(month, []);
			}
			cohorts.get(month)!.push(org.id);
		});

		// For each cohort, calculate retention
		const cohortData: CohortData[] = [];

		for (const [month, orgIds] of cohorts.entries()) {
			const cohortSize = orgIds.length;
			const cohortDate = new Date(month + '-01');

			// Calculate retention for each period
			// An org is "retained" if they have any activity in that month

			// Month 0 (always 100%)
			const retention: CohortData['retention_rates'] = {
				month_0: 100,
				month_1: 0,
				month_2: 0,
				month_3: 0,
				month_6: 0,
				month_12: 0,
			};

			// Calculate retention for each period
			const periods = [1, 2, 3, 6, 12];

			for (const period of periods) {
				const targetMonth = new Date(cohortDate);
				targetMonth.setMonth(targetMonth.getMonth() + period);
				const monthStart = targetMonth.toISOString().substring(0, 7) + '-01';
				const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)
					.toISOString()
					.split('T')[0];

				// Count how many orgs in this cohort had activity in target month
				let activeOrgs = 0;

				for (const orgId of orgIds) {
					// Check if org had any time entries in this month
					const { count } = await supabase
						.from('time_entries')
						.select('id', { count: 'exact', head: true })
						.eq('org_id', orgId)
						.gte('date', monthStart)
						.lte('date', monthEnd);

					if (count && count > 0) {
						activeOrgs++;
					}
				}

				const retentionRate = (activeOrgs / cohortSize) * 100;
				retention[`month_${period}` as keyof typeof retention] = retentionRate;
			}

			cohortData.push({
				cohort_month: month,
				cohort_size: cohortSize,
				retention_rates: retention,
			});
		}

		return cohortData;
	} catch (error) {
		console.error('Error fetching cohort retention:', error);
		return [];
	}
}

/**
 * Get organizations at risk of churning
 * Identifies orgs with low activity or warning signs
 */
export async function getChurnRiskOrganizations(): Promise<ChurnRisk[]> {
	const supabase = await createClient();

	try {
		const risks: ChurnRisk[] = [];

		// Get all active organizations
		const { data: orgs } = await supabase
			.from('organizations')
			.select('id, name')
			.eq('status', 'active');

		if (!orgs) {
			return [];
		}

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		for (const org of orgs) {
			const riskFactors: string[] = [];
			let riskScore = 0;

			// Check last activity (time entries)
			const { data: recentEntries } = await supabase
				.from('time_entries')
				.select('date')
				.eq('org_id', org.id)
				.order('date', { ascending: false })
				.limit(1);

			const lastActivity = recentEntries?.[0]?.date || null;
			const daysInactive = lastActivity
				? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
				: 999;

			// Risk factor: No activity in 30 days
			if (daysInactive > 30) {
				riskFactors.push('Ingen aktivitet på 30+ dagar');
				riskScore += 40;
			} else if (daysInactive > 14) {
				riskFactors.push('Ingen aktivitet på 14+ dagar');
				riskScore += 25;
			} else if (daysInactive > 7) {
				riskFactors.push('Ingen aktivitet på 7+ dagar');
				riskScore += 10;
			}

			// Risk factor: Low activity count
			const { count: activityCount } = await supabase
				.from('time_entries')
				.select('id', { count: 'exact', head: true })
				.eq('org_id', org.id)
				.gte('date', thirtyDaysAgoStr);

			if (activityCount !== null && activityCount < 5) {
				riskFactors.push('Låg aktivitet (< 5 tidrapporter/månad)');
				riskScore += 20;
			}

			// Risk factor: No users added recently
			const { count: userCount } = await supabase
				.from('organization_members')
				.select('user_id', { count: 'exact', head: true })
				.eq('org_id', org.id);

			if (userCount !== null && userCount === 1) {
				riskFactors.push('Endast en användare');
				riskScore += 15;
			}

			// Risk factor: No projects
			const { count: projectCount } = await supabase
				.from('projects')
				.select('id', { count: 'exact', head: true })
				.eq('org_id', org.id);

			if (projectCount !== null && projectCount === 0) {
				riskFactors.push('Inga projekt skapade');
				riskScore += 25;
			}

			// Only include orgs with some risk
			if (riskScore > 0) {
				risks.push({
					org_id: org.id,
					org_name: org.name,
					risk_score: Math.min(riskScore, 100),
					risk_factors: riskFactors,
					last_active: lastActivity || 'Aldrig',
					days_inactive: daysInactive,
				});
			}
		}

		// Sort by risk score (highest first)
		return risks.sort((a, b) => b.risk_score - a.risk_score);
	} catch (error) {
		console.error('Error fetching churn risk:', error);
		return [];
	}
}

/**
 * Get simple retention rate
 * Percentage of orgs active this month vs last month
 */
export async function getRetentionRate(): Promise<{
	last_month_active: number;
	this_month_active: number;
	retention_rate: number;
}> {
	const supabase = await createClient();

	try {
		const now = new Date();
		const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
		const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
		const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

		// Get orgs active last month
		const { data: lastMonthOrgs } = await supabase
			.from('time_entries')
			.select('org_id')
			.gte('date', lastMonthStart)
			.lte('date', lastMonthEnd);

		const lastMonthActive = new Set((lastMonthOrgs || []).map((t: { org_id: string }) => t.org_id)).size;

		// Get orgs active this month
		const { data: thisMonthOrgs } = await supabase
			.from('time_entries')
			.select('org_id')
			.gte('date', thisMonthStart);

		const thisMonthActive = new Set((thisMonthOrgs || []).map((t: { org_id: string }) => t.org_id)).size;

		// Calculate retention (of those active last month, how many are still active)
		const retentionRate = lastMonthActive > 0
			? (thisMonthActive / lastMonthActive) * 100
			: 0;

		return {
			last_month_active: lastMonthActive,
			this_month_active: thisMonthActive,
			retention_rate: retentionRate,
		};
	} catch (error) {
		console.error('Error fetching retention rate:', error);
		return {
			last_month_active: 0,
			this_month_active: 0,
			retention_rate: 0,
		};
	}
}

