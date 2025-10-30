/**
 * Format plain date string (YYYY-MM-DD) without timezone conversion
 * 
 * PROBLEM: new Date('2025-10-27') parses as UTC, causing -1 day in negative timezones
 * SOLUTION: Add T00:00:00 to force local time interpretation
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param locale - Locale for formatting (default: 'sv-SE')
 * @param style - Date style (default: 'full')
 * @returns Formatted date string
 */
export function formatPlainDate(
	dateStr: string,
	locale: string = 'sv-SE',
	style: 'full' | 'long' | 'medium' | 'short' = 'full'
): string {
	// Add T00:00:00 to interpret as LOCAL time (not UTC)
	const safe = `${dateStr}T00:00:00`;
	const d = new Date(safe);
	return d.toLocaleDateString(locale, { dateStyle: style });
}

/**
 * Parse YYYY-MM-DD into year, month, day numbers
 * Useful for custom formatting without Date object
 */
export function parseYMD(dateStr: string): { y: number; m: number; d: number } {
	const [y, m, d] = dateStr.split('-').map(Number);
	return { y, m, d };
}

/**
 * Get weekday name from YYYY-MM-DD
 */
export function getWeekdayName(dateStr: string, locale: string = 'sv-SE'): string {
	const safe = `${dateStr}T00:00:00`;
	const d = new Date(safe);
	return d.toLocaleDateString(locale, { weekday: 'long' });
}

/**
 * Format as "söndag 27 oktober 2025" (Swedish full format)
 */
export function formatSwedishFull(dateStr: string): string {
	const safe = `${dateStr}T00:00:00`;
	const d = new Date(safe);
	const weekday = d.toLocaleDateString('sv-SE', { weekday: 'long' });
	const day = d.getDate();
	const month = d.toLocaleDateString('sv-SE', { month: 'long' });
	const year = d.getFullYear();
	return `${weekday} ${day} ${month} ${year}`;
}







