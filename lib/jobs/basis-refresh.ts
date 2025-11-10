import { createClient } from '@/lib/supabase/server';

interface PayrollRules {
	normal_hours_threshold: number;
	auto_break_duration: number; // minutes
	auto_break_after_hours: number;
	overtime_multiplier: number;
	ob_rates: {
		night?: number;
		weekend?: number;
		holiday?: number;
	};
}

interface PayrollBasisResult {
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

type Session = {
	check_in: string;
	check_out: string;
	project_id?: string;
};

type Interval = {
	start: Date;
	end: Date;
};

const HOUR = 3_600_000;

const toDate = (value: string) => new Date(value);

const durH = (start: Date, end: Date) => Math.max(0, (end.getTime() - start.getTime()) / HOUR);

function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6;
}

function isNight(date: Date): boolean {
	const hour = date.getHours();
	return hour >= 22 || hour < 6;
}

function isHoliday(_date: Date): boolean {
	// TODO: Replace with proper Swedish holiday calendar if available
	return false;
}

function clipToPeriod(interval: Interval, from: Date, to: Date): Interval | null {
	const start = new Date(Math.max(interval.start.getTime(), from.getTime()));
	const end = new Date(Math.min(interval.end.getTime(), to.getTime()));
	return end > start ? { start, end } : null;
}

function mergeOverlaps(intervals: Interval[]): Interval[] {
	if (intervals.length === 0) {
		return [];
	}

	const sorted = intervals
		.map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) }))
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	const merged: Interval[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i += 1) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		if (current.start.getTime() <= last.end.getTime()) {
			if (current.end.getTime() > last.end.getTime()) {
				last.end = new Date(current.end);
			}
		} else {
			merged.push({ start: new Date(current.start), end: new Date(current.end) });
		}
	}

	return merged;
}

function subtractMinutesSmart(intervals: Interval[], minutes: number, isOB: (date: Date) => boolean): Interval[] {
	if (minutes <= 0 || intervals.length === 0) {
		return mergeOverlaps(intervals);
	}

	const totalDurationMs = intervals.reduce((sum, interval) => sum + Math.max(0, interval.end.getTime() - interval.start.getTime()), 0);
	const totalRemoveMs = minutes * 60_000;

	if (totalDurationMs === 0 || totalRemoveMs <= 0) {
		return mergeOverlaps(intervals);
	}

	if (totalRemoveMs >= totalDurationMs) {
		return [];
	}

	const clone = intervals.map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) }));
	let toRemoveMs = totalRemoveMs;

	const CHUNK = 15 * 60_000;
	type Chunk = { start: number; end: number; ob: boolean; idx: number };

	const chunks: Chunk[] = [];

	clone.forEach((interval, idx) => {
		let cursor = interval.start.getTime();
		while (cursor < interval.end.getTime()) {
			const chunkEnd = Math.min(interval.end.getTime(), cursor + CHUNK);
			const midpoint = new Date((cursor + chunkEnd) / 2);
			chunks.push({ start: cursor, end: chunkEnd, ob: isOB(midpoint), idx });
			cursor = chunkEnd;
		}
	});

	const adjustIntervalStart = (chunk: Chunk, amount: number) => {
		const interval = clone[chunk.idx];
		if (!interval) {
			return 0;
		}

		const available = Math.max(0, interval.end.getTime() - interval.start.getTime());
		if (available <= 0) {
			return 0;
		}

		const toTake = Math.min(amount, available);
		interval.start = new Date(interval.start.getTime() + toTake);
		return toTake;
	};

	for (const chunk of chunks) {
		if (toRemoveMs <= 0) {
			break;
		}
		if (chunk.ob) {
			continue;
		}
		const chunkLength = chunk.end - chunk.start;
		const removed = adjustIntervalStart(chunk, Math.min(chunkLength, toRemoveMs));
		toRemoveMs -= removed;
	}

	if (toRemoveMs > 0) {
		const obChunks = chunks.filter((chunk) => chunk.ob);
		const totalObMs = obChunks.reduce((sum, chunk) => sum + (chunk.end - chunk.start), 0) || 1;

		for (const chunk of obChunks) {
			if (toRemoveMs <= 0) {
				break;
			}
			const chunkLength = chunk.end - chunk.start;
			const share = (chunkLength / totalObMs) * toRemoveMs;
			const removed = adjustIntervalStart(chunk, Math.min(chunkLength, share, toRemoveMs));
			toRemoveMs -= removed;
		}
	}

	return mergeOverlaps(clone.filter((interval) => interval.end.getTime() > interval.start.getTime()));
}

function calcOBOnIntervals(intervals: Interval[], obRates: PayrollRules['ob_rates']) {
	let actualHours = 0;
	let weightedMultiplierSum = 0;

	for (const interval of intervals) {
		let cursor = new Date(interval.start);
		while (cursor < interval.end) {
			const hourEnd = new Date(Math.min(interval.end.getTime(), cursor.getTime() + HOUR));
			const length = durH(cursor, hourEnd);
			let multiplier: number | null = null;

			if (isHoliday(cursor) && obRates.holiday) {
				multiplier = obRates.holiday;
			} else if (isWeekend(cursor) && obRates.weekend) {
				multiplier = obRates.weekend;
			} else if (isNight(cursor) && obRates.night) {
				multiplier = obRates.night;
			}

			if (multiplier && multiplier > 1 && length > 0) {
				actualHours += length;
				weightedMultiplierSum += length * multiplier;
			}

			cursor = hourEnd;
		}
	}

	const averageMultiplier = actualHours > 0 ? weightedMultiplierSum / actualHours : 1;
	return { actualHours, averageMultiplier };
}

function isoWeekId(date: Date) {
	const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNumber = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function splitWeeklyOvertime(intervals: Interval[], weeklyNorm: number) {
	if (intervals.length === 0) {
		return { hoursNorm: 0, hoursOvertime: 0 };
	}

	const byWeek = new Map<string, number>();

	for (const interval of intervals) {
		let cursor = new Date(interval.start);
		while (cursor < interval.end) {
			const dayEnd = new Date(cursor);
			dayEnd.setHours(23, 59, 59, 999);
			const segmentEnd = new Date(Math.min(dayEnd.getTime(), interval.end.getTime()));
			const hours = durH(cursor, segmentEnd);

			if (hours > 0) {
				const key = isoWeekId(cursor);
				byWeek.set(key, (byWeek.get(key) ?? 0) + hours);
			}

			cursor = new Date(segmentEnd.getTime());
			cursor.setMilliseconds(cursor.getMilliseconds() + 1);
		}
	}

	let hoursNorm = 0;
	let hoursOvertime = 0;
	const weeklyThreshold = weeklyNorm > 0 ? weeklyNorm : 40;

	for (const totalHours of byWeek.values()) {
		hoursNorm += Math.min(totalHours, weeklyThreshold);
		hoursOvertime += Math.max(0, totalHours - weeklyThreshold);
	}

	return { hoursNorm, hoursOvertime };
}

export async function refreshPayrollBasis(
	orgId: string,
	periodStart: string,
	periodEnd: string,
	personIds?: string[],
): Promise<void> {
	const supabase = await createClient();
	const rules = await getPayrollRules(orgId);

	const personSessions = await fetchSessionsForOrg(
		supabase,
		orgId,
		periodStart,
		periodEnd,
		personIds,
	);

	if (personSessions.size === 0) {
		throw new Error('No data found for the selected period.');
	}

	const personIdsArray = Array.from(personSessions.keys());
	const salaryMap = await getSalaryMap(supabase, orgId, personIdsArray);

	const periodFrom = new Date(`${periodStart}T00:00:00Z`);
	const periodTo = new Date(`${periodEnd}T23:59:59.999Z`);

	const results: PayrollBasisResult[] = [];

	for (const [personId, sessions] of personSessions.entries()) {
		const rawIntervals: Interval[] = [];

		sessions.forEach((session) => {
			if (!session.check_out) {
				return;
			}
			const clipped = clipToPeriod(
				{ start: toDate(session.check_in), end: toDate(session.check_out) },
				periodFrom,
				periodTo,
			);
			if (clipped) {
				rawIntervals.push(clipped);
			}
		});

		if (rawIntervals.length === 0) {
			continue;
		}

		const merged = mergeOverlaps(rawIntervals);
		const rawHours = merged.reduce((sum, interval) => sum + durH(interval.start, interval.end), 0);

		let adjustedIntervals = merged;
		const breakMinutes = rules.auto_break_duration ?? 0;
		const meetsBreakThreshold = rawHours >= (rules.auto_break_after_hours ?? 0);

		if (meetsBreakThreshold && breakMinutes > 0) {
			const isOB = (date: Date) =>
				(isHoliday(date) && !!rules.ob_rates?.holiday) ||
				(isWeekend(date) && !!rules.ob_rates?.weekend) ||
				(isNight(date) && !!rules.ob_rates?.night);
			adjustedIntervals = subtractMinutesSmart(merged, breakMinutes, isOB);
		}

		const netHours = adjustedIntervals.reduce((sum, interval) => sum + durH(interval.start, interval.end), 0);
		const breakHours = Math.max(0, rawHours - netHours);

		const obStats = calcOBOnIntervals(adjustedIntervals, rules.ob_rates || {});
		const averageObMultiplier = obStats.averageMultiplier || 1;
		const obExtraMultiplier = Math.max(0, averageObMultiplier - 1);

		const { hoursNorm, hoursOvertime } = splitWeeklyOvertime(
			adjustedIntervals,
			rules.normal_hours_threshold ?? 40,
		);

		const hourlySalary = salaryMap.get(personId) ?? 0;
		let grossSalary = 0;

		if (hourlySalary > 0) {
			grossSalary += hoursNorm * hourlySalary;
			grossSalary += hoursOvertime * hourlySalary * (rules.overtime_multiplier ?? 1.5);

			if (obStats.actualHours > 0 && obExtraMultiplier > 0) {
				grossSalary += obStats.actualHours * hourlySalary * obExtraMultiplier;
			}
		}

		results.push({
			person_id: personId,
			period_start: periodStart,
			period_end: periodEnd,
			hours_norm: Number(hoursNorm.toFixed(2)),
			hours_overtime: Number(hoursOvertime.toFixed(2)),
			ob_hours: Number(obStats.actualHours.toFixed(2)),
			ob_hours_actual: Number(obStats.actualHours.toFixed(2)),
			ob_hours_multiplier: Number(averageObMultiplier.toFixed(4)),
			break_hours: Number(breakHours.toFixed(2)),
			total_hours: Number(netHours.toFixed(2)),
			gross_salary_sek: Number(grossSalary.toFixed(2)),
		});
	}

	if (results.length === 0) {
		throw new Error('No payroll basis could be calculated. Ensure there are approved time entries or attendance sessions.');
	}

	const deleteResult = await supabase
		.from('payroll_basis')
		.delete()
		.eq('org_id', orgId)
		.gte('period_start', periodStart)
		.lte('period_end', periodEnd);

	if (deleteResult.error) {
		throw new Error(`Failed to reset existing payroll basis: ${deleteResult.error.message}`);
	}

	const insertPayload = results.map((result) => ({
		org_id: orgId,
		person_id: result.person_id,
		period_start: result.period_start,
		period_end: result.period_end,
		hours_norm: result.hours_norm,
		hours_overtime: result.hours_overtime,
		ob_hours: result.ob_hours,
		ob_hours_actual: result.ob_hours_actual,
		ob_hours_multiplier: result.ob_hours_multiplier,
		break_hours: result.break_hours,
		total_hours: result.total_hours,
		gross_salary_sek: result.gross_salary_sek,
		locked: false,
		locked_by: null,
		locked_at: null,
	}));

	const insertResult = await supabase.from('payroll_basis').insert(insertPayload);

	if (insertResult.error) {
		throw new Error(`Failed to save payroll basis: ${insertResult.error.message}`);
	}
}

async function getPayrollRules(orgId: string): Promise<PayrollRules> {
	const supabase = await createClient();
	
	const { data: rules } = await supabase
		.from('payroll_rules')
		.select('*')
		.eq('org_id', orgId)
		.single();
	
	if (rules) {
		return {
			normal_hours_threshold: rules.normal_hours_threshold || 40,
			auto_break_duration: rules.auto_break_duration || 30,
			auto_break_after_hours: rules.auto_break_after_hours || 6,
			overtime_multiplier: rules.overtime_multiplier || 1.5,
			ob_rates: rules.ob_rates || { night: 1.2, weekend: 1.5, holiday: 2.0 },
		};
	}
	
	return {
		normal_hours_threshold: 40,
		auto_break_duration: 30,
		auto_break_after_hours: 6,
		overtime_multiplier: 1.5,
		ob_rates: { night: 1.2, weekend: 1.5, holiday: 2.0 },
	};
}

async function fetchSessionsForOrg(
	supabase: any,
	orgId: string,
	periodStart: string,
	periodEnd: string,
	personIds?: string[],
) {
	const sessionsMap = new Map<string, Session[]>();
	const startTs = `${periodStart}T00:00:00Z`;
	const endTs = `${periodEnd}T23:59:59Z`;

	let timeEntriesQuery = supabase
		.from('time_entries')
		.select('user_id, start_at, stop_at, status, project_id')
		.eq('org_id', orgId)
		.eq('status', 'approved')
		.gte('start_at', startTs)
		.lte('start_at', endTs)
		.not('stop_at', 'is', null);
	
	if (personIds && personIds.length > 0) {
		timeEntriesQuery = timeEntriesQuery.in('user_id', personIds);
	}
	
	const { data: timeEntries, error: timeEntriesError } = await timeEntriesQuery;
	
	if (timeEntriesError) {
		throw new Error(`Failed to fetch time entries: ${timeEntriesError.message}`);
	}
	
	timeEntries?.forEach((entry: any) => {
		if (!entry.stop_at) {
			return;
		}
		pushSession(sessionsMap, entry.user_id, {
			check_in: entry.start_at,
			check_out: entry.stop_at,
			project_id: entry.project_id ?? undefined,
		});
	});

	try {
		let attendanceQuery = supabase
			.from('attendance_session')
			.select('person_id, check_in_ts, check_out_ts, project_id')
			.eq('org_id', orgId)
			.gte('check_in_ts', startTs)
			.lte('check_in_ts', endTs)
			.not('check_out_ts', 'is', null);

		if (personIds && personIds.length > 0) {
			attendanceQuery = attendanceQuery.in('person_id', personIds);
		}

		const { data: attendanceSessions, error: attendanceError } = await attendanceQuery;

		if (attendanceError) {
			if (!attendanceError.message?.includes('schema')) {
				throw new Error(`Failed to fetch attendance sessions: ${attendanceError.message}`);
			}
		} else {
			attendanceSessions?.forEach((session: any) => {
				if (!session.check_out_ts) {
					return;
				}

				if (sessionsMap.has(session.person_id) && (sessionsMap.get(session.person_id)?.length || 0) > 0) {
					return;
				}

				pushSession(sessionsMap, session.person_id, {
					check_in: session.check_in_ts,
					check_out: session.check_out_ts,
					project_id: session.project_id ?? undefined,
				});
			});
		}
	} catch (error: any) {
		if (!error?.message?.includes('schema')) {
			throw error;
		}
	}

	return sessionsMap;
}

async function getSalaryMap(supabase: any, orgId: string, personIds: string[]) {
	if (personIds.length === 0) {
		return new Map<string, number>();
	}

	const { data, error } = await supabase
		.from('memberships')
		.select('user_id, salary_per_hour_sek')
		.eq('org_id', orgId)
		.eq('is_active', true)
		.in('user_id', personIds);

	if (error) {
		throw new Error(`Failed to fetch salary information: ${error.message}`);
	}

	const map = new Map<string, number>();
	data?.forEach((membership: any) => {
		if (membership.salary_per_hour_sek !== null && membership.salary_per_hour_sek !== undefined) {
			map.set(membership.user_id, Number(membership.salary_per_hour_sek));
		}
	});

	return map;
}

function pushSession(map: Map<string, Session[]>, personId: string, session: Session) {
	if (!session.check_out) {
		return;
	}

	if (!map.has(personId)) {
		map.set(personId, []);
	}

	map.get(personId)!.push(session);
}

export const _internals_for_test = {
	subtractMinutesSmart,
	calcOBOnIntervals,
	splitWeeklyOvertime,
};

