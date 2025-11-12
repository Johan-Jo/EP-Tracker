import { DateTime } from 'luxon';

import { createClient } from '@/lib/supabase/server';

const DEFAULT_TIMEZONE = 'Europe/Stockholm';
const SHIFT_MAX_HOURS = 16;
const SHIFT_MAX_MS = SHIFT_MAX_HOURS * 60 * 60 * 1000;

type Span = { start: Date; end: Date };
type BreakWindowDef = { start: string; end: string };
type OBRates = { night?: number; weekend?: number; holiday?: number };

interface PayrollRules {
	org_timezone?: string | null;
	workday_start_local?: string | null;
	workday_end_local?: string | null;
	break_windows?: BreakWindowDef[] | null;
	normal_hours_threshold: number;
	overtime_multiplier: number;
	ob_rates: OBRates;
	auto_break_duration?: number | null;
	auto_break_after_hours?: number | null;
}

interface PayrollBasisRow {
	person_id: string;
	period_start: string;
	period_end: string;
	hours_norm: number;
	hours_overtime: number;
	ob_hours: number;
	ob_hours_actual: number;
	ob_hours_multiplier: number;
	break_hours: number;
	total_hours: number;
	gross_salary_sek: number;
}

interface OBStats {
	actualMinutes: number;
	weightedMultiplierSum: number;
	averageMultiplier: number;
}

interface RemoveResult {
	spans: Span[];
	removedMinutes: number;
}

async function getPayrollRules(orgId: string): Promise<PayrollRules> {
	const supabase = await createClient();

	const { data } = await supabase
		.from('payroll_rules')
		.select(
			`org_timezone, workday_start_local, workday_end_local, break_windows,
			 normal_hours_threshold, overtime_multiplier, ob_rates,
			 auto_break_duration, auto_break_after_hours`,
		)
		.eq('org_id', orgId)
		.single();

	return {
		org_timezone: data?.org_timezone ?? DEFAULT_TIMEZONE,
		workday_start_local: data?.workday_start_local ?? null,
		workday_end_local: data?.workday_end_local ?? null,
		break_windows: Array.isArray(data?.break_windows) ? data.break_windows : [],
		normal_hours_threshold: typeof data?.normal_hours_threshold === 'number'
			? data.normal_hours_threshold
			: 40,
		overtime_multiplier: typeof data?.overtime_multiplier === 'number'
			? data.overtime_multiplier
			: 1.5,
		ob_rates: typeof data?.ob_rates === 'object' && data?.ob_rates !== null ? data.ob_rates : {},
		auto_break_duration: data?.auto_break_duration ?? null,
		auto_break_after_hours: data?.auto_break_after_hours ?? null,
	};
}

function spanDurationMinutes(span: Span): number {
	return Math.max(0, Math.round((span.end.getTime() - span.start.getTime()) / 60000));
}

function mergeSpans(spans: Span[]): Span[] {
	if (spans.length === 0) return [];
	const sorted = spans.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
	const merged: Span[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i += 1) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		if (current.start.getTime() <= last.end.getTime()) {
			last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
		} else {
			merged.push({ start: new Date(current.start), end: new Date(current.end) });
		}
	}

	return merged.filter((span) => spanDurationMinutes(span) > 0);
}

function clipSpanToPeriod(span: Span, periodStart: Date, periodEnd: Date): Span | null {
	const start = Math.max(span.start.getTime(), periodStart.getTime());
	const end = Math.min(span.end.getTime(), periodEnd.getTime());
	if (start >= end) return null;
	return { start: new Date(start), end: new Date(end) };
}

function clampSpan(span: Span): Span | null {
	const duration = span.end.getTime() - span.start.getTime();
	if (duration <= 0) return null;
	if (duration <= SHIFT_MAX_MS) {
		return { start: new Date(span.start), end: new Date(span.end) };
	}
	return {
		start: new Date(span.start),
		end: new Date(span.start.getTime() + SHIFT_MAX_MS),
	};
}

function splitAtLocalMidnights(spans: Span[], tz: string): Span[] {
	const result: Span[] = [];

	for (const span of spans) {
		const startLocal = DateTime.fromJSDate(span.start, { zone: 'utc' }).setZone(tz);
		const endLocal = DateTime.fromJSDate(span.end, { zone: 'utc' }).setZone(tz);

		let cursor = startLocal;
		while (cursor < endLocal) {
			const nextMidnight = cursor.plus({ days: 1 }).startOf('day');
			const sliceEnd = endLocal < nextMidnight ? endLocal : nextMidnight;
			if (sliceEnd <= cursor) break;

			result.push({
				start: cursor.toUTC().toJSDate(),
				end: sliceEnd.toUTC().toJSDate(),
			});

			cursor = sliceEnd;
		}
	}

	return result;
}

function parseHHMM(value: string): { hour: number; minute: number } | null {
	const match = /^(\d{2}):(\d{2})$/.exec(value);
	if (!match) return null;
	const hour = Number(match[1]);
	const minute = Number(match[2]);
	if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
	return { hour, minute };
}

function buildBreakIntervalsForPeriod(
	periodStart: Date,
	periodEnd: Date,
	breakWindows: BreakWindowDef[],
	tz: string,
): Span[] {
	if (breakWindows.length === 0) return [];

	const startDT = DateTime.fromJSDate(periodStart, { zone: 'utc' }).setZone(tz).startOf('day');
	const endDT = DateTime.fromJSDate(periodEnd, { zone: 'utc' }).setZone(tz).endOf('day');
	const intervals: Span[] = [];

	for (let day = startDT; day <= endDT; day = day.plus({ days: 1 })) {
		for (const window of breakWindows) {
			const startParsed = window?.start ? parseHHMM(window.start) : null;
			const endParsed = window?.end ? parseHHMM(window.end) : null;
			if (!startParsed || !endParsed) continue;

			let windowStartLocal = day.set({
				hour: startParsed.hour,
				minute: startParsed.minute,
				second: 0,
				millisecond: 0,
			});
			let windowEndLocal = day.set({
				hour: endParsed.hour,
				minute: endParsed.minute,
				second: 0,
				millisecond: 0,
			});

			if (windowEndLocal <= windowStartLocal) {
				windowEndLocal = windowEndLocal.plus({ days: 1 });
			}

			const windowStartUTC = windowStartLocal.toUTC();
			const windowEndUTC = windowEndLocal.toUTC();

			const periodStartDT = DateTime.fromJSDate(periodStart, { zone: 'utc' });
			const periodEndDT = DateTime.fromJSDate(periodEnd, { zone: 'utc' });

			const clippedStart = windowStartUTC < periodStartDT ? periodStartDT : windowStartUTC;
			const clippedEnd = windowEndUTC > periodEndDT ? periodEndDT : windowEndUTC;
			if (clippedEnd <= clippedStart) continue;

			intervals.push({
				start: clippedStart.toJSDate(),
				end: clippedEnd.toJSDate(),
			});
		}
	}

	return mergeSpans(intervals);
}

function subtractInterval(span: Span, interval: Span): Span[] {
	const overlapStart = Math.max(span.start.getTime(), interval.start.getTime());
	const overlapEnd = Math.min(span.end.getTime(), interval.end.getTime());
	if (overlapStart >= overlapEnd) return [span];

	const segments: Span[] = [];
	if (span.start.getTime() < overlapStart) {
		segments.push({ start: new Date(span.start), end: new Date(overlapStart) });
	}
	if (overlapEnd < span.end.getTime()) {
		segments.push({ start: new Date(overlapEnd), end: new Date(span.end) });
	}
	return segments;
}

function subtractIntervals(spans: Span[], intervals: Span[]): RemoveResult {
	if (spans.length === 0 || intervals.length === 0) {
		return { spans, removedMinutes: 0 };
	}

	const sortedIntervals = mergeSpans(intervals);
	const output: Span[] = [];
	let removedMinutes = 0;

	for (const span of spans) {
		let slices: Span[] = [{ start: new Date(span.start), end: new Date(span.end) }];
		for (const interval of sortedIntervals) {
			const next: Span[] = [];
			for (const slice of slices) {
				next.push(...subtractInterval(slice, interval));
			}
			slices = next;
			if (slices.length === 0) break;
		}

		const originalMinutes = spanDurationMinutes(span);
		const remainingMinutes = slices.reduce((sum, slice) => sum + spanDurationMinutes(slice), 0);
		removedMinutes += originalMinutes - remainingMinutes;
		output.push(...slices);
	}

	return { spans: mergeSpans(output), removedMinutes };
}

type OBSegment = { start: Date; end: Date; multiplier: number; isOB: boolean };

function segmentSpanByOB(span: Span, tz: string, rates: OBRates): OBSegment[] {
	const startLocal = DateTime.fromJSDate(span.start, { zone: 'utc' }).setZone(tz);
	const endLocal = DateTime.fromJSDate(span.end, { zone: 'utc' }).setZone(tz);

	const dayStart = startLocal.startOf('day');
	const boundarySix = dayStart.plus({ hours: 6 });
	const boundaryTwentyTwo = dayStart.plus({ hours: 22 });
	const points = [startLocal];
	if (boundarySix > startLocal && boundarySix < endLocal) points.push(boundarySix);
	if (boundaryTwentyTwo > startLocal && boundaryTwentyTwo < endLocal) points.push(boundaryTwentyTwo);
	points.push(endLocal);
	points.sort((a, b) => a.toMillis() - b.toMillis());

	const isWeekend = startLocal.weekday === 6 || startLocal.weekday === 7;

	const segments: OBSegment[] = [];
	for (let i = 0; i < points.length - 1; i += 1) {
		const segStart = points[i];
		const segEnd = points[i + 1];
		if (segEnd <= segStart) continue;

		let multiplier = 1;
		if (isWeekend && rates.weekend && rates.weekend > 1) {
			multiplier = Math.max(multiplier, rates.weekend);
		}
		const night = segStart.hour >= 22 || segStart.hour < 6;
		if (night && rates.night && rates.night > 1) {
			multiplier = Math.max(multiplier, rates.night);
		}
		const isHoliday = false; // TODO: Swedish holiday calendar
		if (isHoliday && rates.holiday && rates.holiday > 1) {
			multiplier = Math.max(multiplier, rates.holiday);
		}

		segments.push({
			start: segStart.toUTC().toJSDate(),
			end: segEnd.toUTC().toJSDate(),
			multiplier,
			isOB: multiplier > 1,
		});
	}

	return segments;
}

function calculateOB(spans: Span[], tz: string, rates: OBRates): OBStats {
	let actualMinutes = 0;
	let weightedMultiplierSum = 0;

	for (const span of spans) {
		const segments = segmentSpanByOB(span, tz, rates);
		for (const segment of segments) {
			const minutes = spanDurationMinutes(segment);
			if (!segment.isOB || minutes <= 0) continue;
			actualMinutes += minutes;
			weightedMultiplierSum += minutes * segment.multiplier;
		}
	}

	const averageMultiplier = actualMinutes > 0
		? weightedMultiplierSum / actualMinutes
		: 1;

	return { actualMinutes, weightedMultiplierSum, averageMultiplier };
}

function segmentsToSpans(segments: OBSegment[]): Span[] {
	const filtered = segments
		.filter((segment) => spanDurationMinutes(segment) > 0)
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	const spans: Span[] = [];
	for (const segment of filtered) {
		if (spans.length === 0) {
			spans.push({ start: new Date(segment.start), end: new Date(segment.end) });
			continue;
		}

		const last = spans[spans.length - 1];
		if (last.end.getTime() === segment.start.getTime()) {
			last.end = new Date(segment.end);
		} else {
			spans.push({ start: new Date(segment.start), end: new Date(segment.end) });
		}
	}

	return spans;
}

function removeMinutesWithOB(spans: Span[], minutes: number, tz: string, rates: OBRates): RemoveResult {
	if (minutes <= 0 || spans.length === 0) {
		return { spans, removedMinutes: 0 };
	}

	let segments = spans.flatMap((span) => segmentSpanByOB(span, tz, rates));
	let remaining = minutes;
	let removedTotal = 0;

	for (const segment of segments) {
		if (remaining <= 0) break;
		if (segment.isOB) continue;
		const duration = spanDurationMinutes(segment);
		if (duration <= 0) continue;
		const remove = Math.min(duration, remaining);
		segment.end = new Date(segment.end.getTime() - remove * 60000);
		remaining -= remove;
		removedTotal += remove;
	}

	segments = segments.filter((segment) => spanDurationMinutes(segment) > 0);

	if (remaining > 0) {
		const obSegments = segments.filter((segment) => segment.isOB);
		let totalObMinutes = obSegments.reduce((sum, segment) => sum + spanDurationMinutes(segment), 0);

		for (let i = 0; remaining > 0 && i < obSegments.length; i += 1) {
			const segment = obSegments[i];
			const duration = spanDurationMinutes(segment);
			if (duration <= 0) continue;

			let remove: number;
			if (i === obSegments.length - 1) {
				remove = Math.min(duration, remaining);
			} else {
				remove = totalObMinutes > 0
					? Math.floor((remaining * duration) / totalObMinutes)
					: 0;
				if (remove <= 0 && remaining > 0) remove = Math.min(1, duration);
				remove = Math.min(remove, remaining, duration);
			}

			if (remove > 0) {
				segment.end = new Date(segment.end.getTime() - remove * 60000);
				remaining -= remove;
				removedTotal += remove;
			}
			totalObMinutes -= duration;
		}
	}

	segments = segments.filter((segment) => spanDurationMinutes(segment) > 0);
	const mergedSpans = mergeSpans(segmentsToSpans(segments));
	return { spans: mergedSpans, removedMinutes: removedTotal };
}

function splitWeeklyOvertime(spans: Span[], tz: string, thresholdHours: number) {
	const weekTotals = new Map<string, number>();

	for (const span of spans) {
		const localStart = DateTime.fromJSDate(span.start, { zone: 'utc' }).setZone(tz);
		const key = `${localStart.weekYear}-${localStart.weekNumber}`;
		const minutes = spanDurationMinutes(span);
		weekTotals.set(key, (weekTotals.get(key) ?? 0) + minutes / 60);
	}

	let hoursNorm = 0;
	let hoursOvertime = 0;
	for (const totalHours of weekTotals.values()) {
		const norm = Math.min(totalHours, thresholdHours);
		hoursNorm += norm;
		hoursOvertime += Math.max(0, totalHours - thresholdHours);
	}

	return { hoursNorm, hoursOvertime };
}

function collectPersonSessions(
	timeEntries: Array<{ user_id: string; start_at: string; stop_at: string | null }> | null,
	attendance: Array<{ person_id: string; check_in_ts: string; check_out_ts: string | null }> | null,
	personFilter?: Set<string>,
): Map<string, Span[]> {
	const map = new Map<string, Span[]>();
	const approvedUsers = new Set<string>();

	if (timeEntries) {
		for (const entry of timeEntries) {
			if (!entry.stop_at) continue;
			if (personFilter && !personFilter.has(entry.user_id)) continue;
			const start = new Date(entry.start_at);
			const end = new Date(entry.stop_at);
			if (!(end.getTime() > start.getTime())) continue;
			const spans = map.get(entry.user_id) ?? [];
			spans.push({ start, end });
			map.set(entry.user_id, spans);
			approvedUsers.add(entry.user_id);
		}
	}

	if (attendance) {
		for (const session of attendance) {
			if (!session.check_out_ts) continue;
			if (approvedUsers.has(session.person_id)) continue;
			if (personFilter && !personFilter.has(session.person_id)) continue;
			const start = new Date(session.check_in_ts);
			const end = new Date(session.check_out_ts);
			if (!(end.getTime() > start.getTime())) continue;
			const spans = map.get(session.person_id) ?? [];
			spans.push({ start, end });
			map.set(session.person_id, spans);
		}
	}

	return map;
}

function sanitizeSpans(spans: Span[], periodStart: Date, periodEnd: Date, tz: string): { rawMinutes: number; spans: Span[] } {
	const clipped = spans
		.map((span) => clipSpanToPeriod(span, periodStart, periodEnd))
		.filter((span): span is Span => Boolean(span));

	const clamped = clipped
		.map((span) => clampSpan(span))
		.filter((span): span is Span => Boolean(span));

	const merged = mergeSpans(clamped);
	const rawMinutes = merged.reduce((sum, span) => sum + spanDurationMinutes(span), 0);
	const split = splitAtLocalMidnights(merged, tz);

	return { rawMinutes, spans: mergeSpans(split) };
}

export async function refreshPayrollBasis(
	orgId: string,
	periodStart: string,
	periodEnd: string,
	personIds?: string[],
): Promise<void> {
	const supabase = await createClient();

	const rules = await getPayrollRules(orgId);
	const timezone = rules.org_timezone || DEFAULT_TIMEZONE;
	const periodStartUtc = new Date(`${periodStart}T00:00:00.000Z`);
	const periodEndUtc = new Date(`${periodEnd}T23:59:59.999Z`);

	const personFilter = personIds && personIds.length > 0 ? new Set(personIds) : undefined;

	const timeEntryQuery = supabase
		.from('time_entries')
		.select('user_id, start_at, stop_at')
		.eq('org_id', orgId)
		.eq('status', 'approved')
		.not('stop_at', 'is', null)
		.lte('start_at', `${periodEnd}T23:59:59Z`)
		.gte('stop_at', `${periodStart}T00:00:00Z`);

	const attendanceQuery = supabase
		.from('attendance_session')
		.select('person_id, check_in_ts, check_out_ts')
		.eq('org_id', orgId)
		.not('check_out_ts', 'is', null)
		.lte('check_in_ts', `${periodEnd}T23:59:59Z`)
		.gte('check_out_ts', `${periodStart}T00:00:00Z`);

	const [timeEntriesRes, attendanceRes] = await Promise.all([
		personFilter ? timeEntryQuery.in('user_id', Array.from(personFilter)) : timeEntryQuery,
		personFilter ? attendanceQuery.in('person_id', Array.from(personFilter)) : attendanceQuery,
	]);

	if (timeEntriesRes.error) {
		throw new Error(`Failed to fetch time entries: ${timeEntriesRes.error.message}`);
	}
	if (attendanceRes.error && !attendanceRes.error.message?.includes('schema cache')) {
		throw new Error(`Failed to fetch attendance sessions: ${attendanceRes.error.message}`);
	}

	const personSessions = collectPersonSessions(
		timeEntriesRes.data ?? null,
		attendanceRes.data ?? null,
		personFilter,
	);

	if (personSessions.size === 0) {
		throw new Error('No data found for the selected period. Please ensure there are approved time entries or attendance sessions.');
	}

	const breakWindows = Array.isArray(rules.break_windows) ? rules.break_windows : [];
	const breakIntervals = breakWindows.length > 0
		? buildBreakIntervalsForPeriod(periodStartUtc, periodEndUtc, breakWindows, timezone)
		: [];

	const shouldApplyAutoBreak = breakWindows.length === 0
		&& typeof rules.auto_break_duration === 'number'
		&& rules.auto_break_duration > 0
		&& typeof rules.auto_break_after_hours === 'number'
		&& rules.auto_break_after_hours > 0;

	const personIdsArray = Array.from(personSessions.keys());
	const salaryMap = new Map<string, number>();

	if (personIdsArray.length > 0) {
		const { data: memberships, error: membershipsError } = await supabase
			.from('memberships')
			.select('user_id, salary_per_hour_sek')
			.eq('org_id', orgId)
			.eq('is_active', true)
			.in('user_id', personIdsArray);

		if (membershipsError) {
			console.warn('Failed to fetch memberships for salary calculation:', membershipsError);
		} else {
			(memberships ?? []).forEach((m) => {
				if (m?.user_id && m?.salary_per_hour_sek !== null) {
					salaryMap.set(m.user_id, Number(m.salary_per_hour_sek));
				}
			});
		}
	}

	const results: PayrollBasisRow[] = [];

	for (const [personId, rawSpans] of personSessions.entries()) {
		if (rawSpans.length === 0) continue;

		const { spans: initialSpans } = sanitizeSpans(rawSpans, periodStartUtc, periodEndUtc, timezone);
		if (initialSpans.length === 0) continue;

		const { spans: afterBreaks, removedMinutes: breakRemoved } = subtractIntervals(initialSpans, breakIntervals);
		let workingSpans = afterBreaks;
		let totalBreakMinutes = breakRemoved;

		if (shouldApplyAutoBreak && workingSpans.length > 0) {
			const thresholdMinutes = (rules.auto_break_after_hours ?? 0) * 60;
			const eligibleCount = workingSpans.filter((span) => spanDurationMinutes(span) >= thresholdMinutes).length;
			const autoMinutes = eligibleCount * (rules.auto_break_duration ?? 0);
			if (autoMinutes > 0) {
				const { spans: adjusted, removedMinutes } = removeMinutesWithOB(
					workingSpans,
					autoMinutes,
					timezone,
					rules.ob_rates,
				);
				workingSpans = adjusted;
				totalBreakMinutes += removedMinutes;
			}
		}

		workingSpans = mergeSpans(workingSpans);
		const netMinutes = workingSpans.reduce((sum, span) => sum + spanDurationMinutes(span), 0);
		if (netMinutes <= 0) continue;

		const obStats = calculateOB(workingSpans, timezone, rules.ob_rates);
		const totalHours = netMinutes / 60;
		const obHours = obStats.actualMinutes / 60;
		const averageObMultiplier = obStats.averageMultiplier;

		const { hoursNorm, hoursOvertime } = splitWeeklyOvertime(
			workingSpans,
			timezone,
			rules.normal_hours_threshold,
		);

		const salaryPerHour = salaryMap.get(personId) ?? 0;
		let grossSalary = 0;
		const obExtraMultiplier = Math.max(averageObMultiplier - 1, 0);

		if (salaryPerHour > 0) {
			grossSalary += hoursNorm * salaryPerHour;
			grossSalary += hoursOvertime * salaryPerHour * rules.overtime_multiplier;
			if (obHours > 0 && averageObMultiplier > 1) {
				grossSalary += obHours * salaryPerHour * obExtraMultiplier;
			}
		}

		if (process.env.LOG_PAYROLL === '1') {
			console.log('[payroll]', {
				personId,
				netHours: Number(totalHours.toFixed(2)),
				breakHours: Number((totalBreakMinutes / 60).toFixed(2)),
				obHours: Number(obHours.toFixed(2)),
				avgObMultiplier: Number(averageObMultiplier.toFixed(4)),
				hoursNorm: Number(hoursNorm.toFixed(2)),
				hoursOvertime: Number(hoursOvertime.toFixed(2)),
				gross: Number(grossSalary.toFixed(2)),
			});
		}

		results.push({
			person_id: personId,
			period_start: periodStart,
			period_end: periodEnd,
			hours_norm: Number(hoursNorm.toFixed(2)),
			hours_overtime: Number(hoursOvertime.toFixed(2)),
			ob_hours: Number(obHours.toFixed(2)),
			ob_hours_actual: Number(obHours.toFixed(2)),
			ob_hours_multiplier: Number(averageObMultiplier.toFixed(4)),
			break_hours: Number((totalBreakMinutes / 60).toFixed(2)),
			total_hours: Number(totalHours.toFixed(2)),
			gross_salary_sek: Number(grossSalary.toFixed(2)),
		});
	}

	if (results.length === 0) {
		throw new Error('No payroll basis could be calculated. Ensure there are approved time entries or attendance sessions for the period.');
	}

	const { error: deleteError } = await supabase
		.from('payroll_basis')
		.delete()
		.eq('org_id', orgId)
		.gte('period_start', periodStart)
		.lte('period_end', periodEnd);

	if (deleteError) {
		throw new Error(`Failed to clear existing payroll basis: ${deleteError.message}`);
	}

	const { error: insertError } = await supabase
		.from('payroll_basis')
		.insert(
			results.map((row) => ({
				org_id: orgId,
				person_id: row.person_id,
				period_start: row.period_start,
				period_end: row.period_end,
				hours_norm: row.hours_norm,
				hours_overtime: row.hours_overtime,
				ob_hours: row.ob_hours,
				ob_hours_actual: row.ob_hours_actual,
				ob_hours_multiplier: row.ob_hours_multiplier,
				break_hours: row.break_hours,
				total_hours: row.total_hours,
				gross_salary_sek: row.gross_salary_sek,
				locked: false,
				locked_by: null,
				locked_at: null,
			})),
		);

	if (insertError) {
		throw new Error(`Failed to save payroll basis: ${insertError.message}`);
	}
}

export const _internals_for_test = {
	spanDurationMinutes,
	mergeSpans,
	splitAtLocalMidnights,
	buildBreakIntervalsForPeriod,
	subtractIntervals,
	removeMinutesWithOB,
	calculateOB,
	splitWeeklyOvertime,
	sanitizeSpans,
};





