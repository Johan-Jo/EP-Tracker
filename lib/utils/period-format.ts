/**
 * Format period for display
 * @param startDate Start date
 * @param endDate End date
 * @returns Formatted period string (e.g., "Vecka 42 2025" or "1-7 Oktober 2025")
 */
export function formatPeriod(startDate: string | Date, endDate: string | Date): string {
	const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
	const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

	// If dates are within the same week, show week number
	const startWeek = getWeekNumber(start);
	const endWeek = getWeekNumber(end);

	if (startWeek === endWeek) {
		return `Vecka ${startWeek} ${start.getFullYear()}`;
	}

	// Otherwise show date range
	const formatter = new Intl.DateTimeFormat('sv-SE', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});

	if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
		// Same month: "1-7 Oktober 2025"
		return `${start.getDate()}-${end.getDate()} ${formatter.format(start).split(' ')[1]} ${start.getFullYear()}`;
	}

	// Different months: "30 September - 6 Oktober 2025"
	return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
	const target = new Date(date.valueOf());
	const dayNr = (date.getDay() + 6) % 7;
	target.setDate(target.getDate() - dayNr + 3);
	const jan4 = new Date(target.getFullYear(), 0, 4);
	const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
	return 1 + Math.ceil(dayDiff / 7);
}

