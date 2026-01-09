/**
 * Date Shifting for Demo Mode
 * 
 * Helper functions to shift dates for demo organization to keep data "current".
 * When demo data is seeded, we store a reference date. When querying, we shift
 * all dates by the difference between the reference date and current date.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get the demo reference date for an organization
 * @param orgId - Organization ID to check
 * @returns Demo reference date or null if not a demo org or no reference date set
 */
export async function getDemoReferenceDate(orgId: string): Promise<Date | null> {
	const supabase = await createClient();
	
	const { data, error } = await supabase
		.from('organizations')
		.select('demo_reference_date, slug')
		.eq('id', orgId)
		.single();
	
	if (error || !data || !data.demo_reference_date) {
		return null;
	}
	
	// Only return reference date if it's the demo org
	if (data.slug !== 'demo') {
		return null;
	}
	
	return new Date(data.demo_reference_date);
}

/**
 * Calculate the date shift offset for demo organization
 * @param referenceDate - The demo reference date (when seed was created)
 * @returns Number of days to shift dates forward (can be negative if reference date is in future)
 */
export function calculateDateShift(referenceDate: Date): number {
	const now = new Date();
	const diffMs = now.getTime() - referenceDate.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	return diffDays;
}

/**
 * Shift a date by a given number of days
 * @param date - Date to shift
 * @param daysOffset - Number of days to add (positive) or subtract (negative)
 * @returns New Date object shifted by the offset
 */
export function shiftDate(date: Date, daysOffset: number): Date {
	const shifted = new Date(date);
	shifted.setDate(shifted.getDate() + daysOffset);
	return shifted;
}

/**
 * Shift a date string (YYYY-MM-DD format) by a given number of days
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param daysOffset - Number of days to add (positive) or subtract (negative)
 * @returns New date string in YYYY-MM-DD format
 */
export function shiftDateString(dateStr: string, daysOffset: number): string {
	const date = new Date(dateStr + 'T00:00:00'); // Force local time
	const shifted = shiftDate(date, daysOffset);
	return shifted.toISOString().split('T')[0];
}

/**
 * Get the effective date for demo organization (with date-shifting applied)
 * @param orgId - Organization ID
 * @param inputDate - Date to potentially shift
 * @returns Shifted date if demo org, otherwise original date
 * 
 * IMPORTANT: For date-shifting, we shift by the difference between the week start dates.
 * If anchor date's week start is different from current week start, we shift to match.
 */
export async function getEffectiveDateForDemo(
	orgId: string,
	inputDate: Date
): Promise<Date> {
	const referenceDate = await getDemoReferenceDate(orgId);
	
	if (!referenceDate) {
		// Not a demo org or no reference date, return original
		return inputDate;
	}
	
	// Calculate week starts (ISO weeks - Monday as first day)
	const getWeekStart = (date: Date): Date => {
		const d = new Date(date);
		const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		const daysToMonday = day === 0 ? -6 : 1 - day; // Convert to Monday-based
		d.setDate(d.getDate() + daysToMonday);
		d.setHours(0, 0, 0, 0);
		return d;
	};
	
	const anchorWeekStart = getWeekStart(referenceDate);
	const inputWeekStart = getWeekStart(inputDate);
	
	// Calculate difference in days between week starts
	const diffMs = inputWeekStart.getTime() - anchorWeekStart.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	
	// Shift input date BACK by the difference to match anchor date's week
	return shiftDate(inputDate, -diffDays);
}

/**
 * Get the effective start date for demo organization stats/query
 * Used for dashboard stats that filter by "start of week" or similar
 * @param orgId - Organization ID
 * @param inputDate - Date to potentially shift (e.g., start of current week)
 * @returns Shifted date if demo org, otherwise original date
 */
export async function getEffectiveStartDateForDemo(
	orgId: string,
	inputDate: Date
): Promise<Date> {
	return getEffectiveDateForDemo(orgId, inputDate);
}

/**
 * Check if an organization is a demo org with date-shifting enabled
 * @param orgId - Organization ID
 * @returns True if demo org with reference date set, false otherwise
 */
export async function isDemoWithDateShifting(orgId: string): Promise<boolean> {
	const referenceDate = await getDemoReferenceDate(orgId);
	return referenceDate !== null;
}
