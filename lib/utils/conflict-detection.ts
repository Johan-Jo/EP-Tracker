import { areIntervalsOverlapping } from 'date-fns';
import type { Conflict, AssignmentWithRelations, AbsenceWithUser } from '@/lib/schemas/planning';

/**
 * Detect conflicts for a given user and time range
 * @param user_id - User ID to check
 * @param start_ts - Start timestamp (ISO string)
 * @param end_ts - End timestamp (ISO string)
 * @param assignments - Array of existing assignments
 * @param absences - Array of existing absences
 * @returns Array of conflicts
 */
export function detectConflicts(
	user_id: string,
	start_ts: string,
	end_ts: string,
	assignments: AssignmentWithRelations[],
	absences: AbsenceWithUser[]
): Conflict[] {
	const conflicts: Conflict[] = [];
	const startDate = new Date(start_ts);
	const endDate = new Date(end_ts);

	// Check for overlapping assignments
	const userAssignments = assignments.filter(
		a => a.user_id === user_id && a.status !== 'cancelled'
	);

	for (const assignment of userAssignments) {
		const assignmentStart = new Date(assignment.start_ts);
		const assignmentEnd = new Date(assignment.end_ts);

		if (areIntervalsOverlapping(
			{ start: startDate, end: endDate },
			{ start: assignmentStart, end: assignmentEnd }
		)) {
			const projectName = assignment.project?.name || 'Okänt projekt';
			const timeRange = formatTimeRange(assignment.start_ts, assignment.end_ts, assignment.all_day);
			conflicts.push({
				user_id,
				type: 'overlap',
				details: `Överlappande uppdrag: ${projectName} (${timeRange})`,
			});
		}
	}

	// Check for absences
	const userAbsences = absences.filter(a => a.user_id === user_id);

	for (const absence of userAbsences) {
		const absenceStart = new Date(absence.start_ts);
		const absenceEnd = new Date(absence.end_ts);

		if (areIntervalsOverlapping(
			{ start: startDate, end: endDate },
			{ start: absenceStart, end: absenceEnd }
		)) {
			const absenceType = formatAbsenceType(absence.type);
			const dateRange = formatDateRange(absence.start_ts, absence.end_ts);
			conflicts.push({
				user_id,
				type: 'absence',
				details: `${absenceType}: ${dateRange}`,
			});
		}
	}

	return conflicts;
}

/**
 * Format time range for display
 */
function formatTimeRange(start_ts: string, end_ts: string, all_day: boolean): string {
	if (all_day) {
		return 'Heldag';
	}

	const start = new Date(start_ts);
	const end = new Date(end_ts);

	const startTime = start.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
	const endTime = end.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

	return `${startTime}–${endTime}`;
}

/**
 * Format date range for display
 */
function formatDateRange(start_ts: string, end_ts: string): string {
	const start = new Date(start_ts);
	const end = new Date(end_ts);

	const startDate = start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
	const endDate = end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });

	if (startDate === endDate) {
		return startDate;
	}

	return `${startDate} – ${endDate}`;
}

/**
 * Format absence type in Swedish
 */
function formatAbsenceType(type: string): string {
	switch (type) {
		case 'vacation':
			return 'Semester';
		case 'sick':
			return 'Sjuk';
		case 'training':
			return 'Utbildning';
		default:
			return type;
	}
}

/**
 * Check if a user has conflicts for multiple assignments
 * Returns a map of user_id -> conflicts[]
 */
export function detectMultiUserConflicts(
	user_ids: string[],
	start_ts: string,
	end_ts: string,
	assignments: AssignmentWithRelations[],
	absences: AbsenceWithUser[]
): Map<string, Conflict[]> {
	const conflictMap = new Map<string, Conflict[]>();

	for (const userId of user_ids) {
		const userConflicts = detectConflicts(userId, start_ts, end_ts, assignments, absences);
		if (userConflicts.length > 0) {
			conflictMap.set(userId, userConflicts);
		}
	}

	return conflictMap;
}

