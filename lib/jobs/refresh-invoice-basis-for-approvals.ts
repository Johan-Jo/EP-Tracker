import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshInvoiceBasis } from './invoice-basis-refresh';

/**
 * Refreshes invoice basis for all affected projects and periods after approval
 * This is called asynchronously after items are approved
 */
export async function refreshInvoiceBasisForApprovals(
	supabase: SupabaseClient<any, 'public', any>,
	orgId: string,
	items: Array<{
		project_id: string;
		date: string; // ISO date string
	}>
): Promise<void> {
	if (!items.length) return;

	// Group by project and calculate period (week) for each item
	const projectPeriods = new Map<string, Set<string>>();

	for (const item of items) {
		if (!item.project_id || !item.date) continue;

		const date = new Date(item.date);
		if (Number.isNaN(date.getTime())) continue;

		// Calculate week start (Monday) and end (Sunday)
		// Use the same logic as in invoice-basis-page.tsx
		const day = date.getDay();
		const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
		const weekStart = new Date(date);
		weekStart.setDate(diff);
		weekStart.setHours(0, 0, 0, 0);

		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 6);
		weekEnd.setHours(23, 59, 59, 999);

		// Format as YYYY-MM-DD (not ISO string with time)
		const periodStart = weekStart.toISOString().split('T')[0];
		const periodEnd = weekEnd.toISOString().split('T')[0];
		const periodKey = `${periodStart}_${periodEnd}`;
		const projectKey = item.project_id;

		if (!projectPeriods.has(projectKey)) {
			projectPeriods.set(projectKey, new Set());
		}
		projectPeriods.get(projectKey)!.add(periodKey);
	}

	// Refresh invoice basis for each project/period combination
	const refreshPromises: Promise<void>[] = [];

	for (const [projectId, periods] of projectPeriods.entries()) {
		for (const periodKey of periods) {
			const [periodStart, periodEnd] = periodKey.split('_');
			
			refreshPromises.push(
				refreshInvoiceBasis({
					orgId,
					projectId,
					periodStart,
					periodEnd,
				}).catch((error) => {
					// Log error but don't throw - we don't want to block the approval
					console.error(
						`[refresh-invoice-basis] Failed to refresh for project ${projectId}, period ${periodStart}-${periodEnd}:`,
						error
					);
				})
			);
		}
	}

	// Wait for all refreshes to complete (but don't block on errors)
	await Promise.allSettled(refreshPromises);
}

