import { createClient } from '@/lib/supabase/server';

// Re-export client-safe utilities
export { formatPeriod, getWeekNumber } from './period-format';

/**
 * Check if a date falls within a locked period
 * @param orgId Organization ID
 * @param date Date to check (string or Date object)
 * @returns Promise<boolean> True if the date is in a locked period
 */
export async function isPeriodLocked(orgId: string, date: string | Date): Promise<boolean> {
	try {
		const supabase = await createClient();
		const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

		const { data, error } = await supabase
			.rpc('is_period_locked', {
				p_org_id: orgId,
				p_date: dateStr,
			});

		if (error) {
			console.error('Error checking period lock:', error);
			return false; // Fail open - don't block operations if check fails
		}

		return data === true;
	} catch (error) {
		console.error('Error in isPeriodLocked:', error);
		return false;
	}
}

/**
 * Check if multiple dates fall within locked periods
 * @param orgId Organization ID
 * @param dates Array of dates to check
 * @returns Promise<Map<string, boolean>> Map of date string to locked status
 */
export async function areDatesLocked(
	orgId: string,
	dates: (string | Date)[]
): Promise<Map<string, boolean>> {
	const results = new Map<string, boolean>();

	for (const date of dates) {
		const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
		const isLocked = await isPeriodLocked(orgId, dateStr);
		results.set(dateStr, isLocked);
	}

	return results;
}
