/**
 * Calculate break deduction minutes for a time entry
 * This matches the logic in components/time/time-page-new.tsx
 */

interface BreakItem {
	label: string;
	start: string; // HH:mm format
	end: string; // HH:mm format
	duration_minutes: number;
}

interface OrgBreakSettings {
	standard_break_minutes_per_day: number;
	standard_breaks: BreakItem[];
}

/**
 * Calculate break minutes to deduct based on time range and organization settings
 */
export function calculateBreakMinutes(
	start: Date,
	end: Date,
	orgBreakSettings: OrgBreakSettings | null
): number {
	if (!orgBreakSettings) return 0;

	// If we have specific breaks defined, calculate based on those
	if (orgBreakSettings.standard_breaks && orgBreakSettings.standard_breaks.length > 0) {
		let totalBreakMinutes = 0;
		const startTimeStr = start.toTimeString().slice(0, 5); // HH:mm format
		const endTimeStr = end.toTimeString().slice(0, 5);

		for (const breakItem of orgBreakSettings.standard_breaks) {
			const breakStart = breakItem.start; // Expected format: "HH:mm"
			const breakEnd = breakItem.end;

			// Check if the work period overlaps with this break
			// Break should be deducted if work period covers any part of the break
			if (startTimeStr <= breakEnd && endTimeStr >= breakStart) {
				// Calculate how much of the break overlaps with work period
				const workStartMinutes = start.getHours() * 60 + start.getMinutes();
				const workEndMinutes = end.getHours() * 60 + end.getMinutes();
				const [breakStartH, breakStartM] = breakStart.split(':').map(Number);
				const [breakEndH, breakEndM] = breakEnd.split(':').map(Number);
				const breakStartMinutes = breakStartH * 60 + breakStartM;
				const breakEndMinutes = breakEndH * 60 + breakEndM;

				// Calculate overlap
				const overlapStart = Math.max(workStartMinutes, breakStartMinutes);
				const overlapEnd = Math.min(workEndMinutes, breakEndMinutes);

				if (overlapStart < overlapEnd) {
					// Use the break's duration_minutes if available, otherwise calculate from times
					totalBreakMinutes += breakItem.duration_minutes || (overlapEnd - overlapStart);
				}
			}
		}

		return totalBreakMinutes;
	}

	// Fallback to standard_break_minutes_per_day if no specific breaks defined
	// Only deduct if work period is long enough (e.g., more than 4 hours)
	const workMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
	if (workMinutes >= 240) {
		// 4 hours or more
		return orgBreakSettings.standard_break_minutes_per_day || 0;
	}

	return 0;
}

/**
 * Calculate work minutes (duration_min minus break deduction)
 */
export function calculateWorkMinutes(
	startAt: string,
	stopAt: string | null,
	durationMin: number | null,
	orgBreakSettings: OrgBreakSettings | null
): number {
	if (!stopAt || !durationMin) return 0;

	const start = new Date(startAt);
	const end = new Date(stopAt);
	const breakMinutes = calculateBreakMinutes(start, end, orgBreakSettings);
	return Math.max(0, durationMin - breakMinutes);
}

