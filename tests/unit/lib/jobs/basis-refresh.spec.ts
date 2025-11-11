import { DateTime } from 'luxon';

import { _internals_for_test } from '@/lib/jobs/basis-refresh';

const {
	spanDurationMinutes,
	buildBreakIntervalsForPeriod,
	subtractIntervals,
	removeMinutesWithOB,
	calculateOB,
	splitWeeklyOvertime,
} = _internals_for_test;

const TZ = 'Europe/Stockholm';

describe('basis-refresh helpers', () => {
	it('calculates night OB hours using local timezone', () => {
		const start = new Date('2025-01-10T21:00:00Z'); // 22:00 local (winter time)
		const end = new Date('2025-01-10T23:30:00Z');
		const span = { start, end };

		const stats = calculateOB([span], TZ, { night: 1.5 });
		const totalMinutes = spanDurationMinutes(span);

		expect(stats.actualMinutes).toBeGreaterThan(0);
		expect(stats.actualMinutes).toBeLessThanOrEqual(totalMinutes);
		expect(stats.averageMultiplier).toBeGreaterThan(1);
	});

	it('subtracts configured break windows from spans', () => {
		const periodStart = DateTime.fromISO('2025-03-01T00:00:00', { zone: TZ }).toUTC().toJSDate();
		const periodEnd = DateTime.fromISO('2025-03-31T23:59:59', { zone: TZ }).toUTC().toJSDate();

		const workStart = DateTime.fromISO('2025-03-05T07:00', { zone: TZ }).toUTC().toJSDate();
		const workEnd = DateTime.fromISO('2025-03-05T16:00', { zone: TZ }).toUTC().toJSDate();

		const span = { start: workStart, end: workEnd };
		const intervals = buildBreakIntervalsForPeriod(periodStart, periodEnd, [{ start: '12:00', end: '12:30' }], TZ);

		const { spans: adjusted, removedMinutes } = subtractIntervals([span], intervals);
		const totalMinutes = adjusted.reduce((sum, item) => sum + spanDurationMinutes(item), 0);

		expect(removedMinutes).toBe(30);
		expect(totalMinutes).toBe((9 * 60) - 30);
	});

	it('removes auto-break minutes preferring non-OB time first', () => {
		const start = DateTime.fromISO('2025-04-10T07:00', { zone: TZ }).toUTC().toJSDate();
		const end = DateTime.fromISO('2025-04-10T15:30', { zone: TZ }).toUTC().toJSDate();
		const span = { start, end };

		const originalMinutes = spanDurationMinutes(span);
		const { spans: adjusted, removedMinutes } = removeMinutesWithOB([span], 30, TZ, { night: 1.5 });
		const adjustedMinutes = adjusted.reduce((sum, item) => sum + spanDurationMinutes(item), 0);

		expect(removedMinutes).toBe(30);
		expect(adjustedMinutes).toBe(originalMinutes - 30);
	});

	it('splits weekly overtime per ISO week boundaries', () => {
		const spans: { start: Date; end: Date }[] = [];
		const base = DateTime.fromISO('2025-05-05T07:00', { zone: TZ }).startOf('day'); // Monday

		for (let i = 0; i < 5; i += 1) {
			const dayStart = base.plus({ days: i }).set({ hour: 7 });
			const dayEnd = dayStart.plus({ hours: 9 });
			spans.push({ start: dayStart.toUTC().toJSDate(), end: dayEnd.toUTC().toJSDate() });
		}

		const { hoursNorm, hoursOvertime } = splitWeeklyOvertime(spans, TZ, 40);

		expect(hoursNorm).toBeCloseTo(40, 5);
		expect(hoursOvertime).toBeCloseTo(5, 5);
	});
});




