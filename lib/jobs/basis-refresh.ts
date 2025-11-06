/**
 * EPIC 33 Phase 2: Payroll Basis Refresh Job
 * 
 * Calculates payroll basis from attendance_session and time_entries
 * Applies rules: breaks, overtime, OB rates
 * 
 * Location: lib/jobs/basis-refresh.ts
 * Trigger: Manual, after lock/unlock, after corrections, after rule changes
 */

import { createClient } from '@/lib/supabase/server';

interface PayrollRules {
	normal_hours_threshold: number; // hours/week for overtime (default 40)
	auto_break_duration: number; // minutes (default 30)
	auto_break_after_hours: number; // hours before auto-break (default 6.0)
	overtime_multiplier: number; // multiplier for overtime (default 1.5)
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
	break_hours: number;
	total_hours: number;
	gross_salary_sek: number;
}

/**
 * Get payroll rules for an organization, with defaults if not configured
 */
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
			auto_break_after_hours: rules.auto_break_after_hours || 6.0,
			overtime_multiplier: rules.overtime_multiplier || 1.5,
			ob_rates: rules.ob_rates || { night: 1.2, weekend: 1.5, holiday: 2.0 },
		};
	}
	
	// Return defaults if no rules configured
	return {
		normal_hours_threshold: 40,
		auto_break_duration: 30,
		auto_break_after_hours: 6.0,
		overtime_multiplier: 1.5,
		ob_rates: { night: 1.2, weekend: 1.5, holiday: 2.0 },
	};
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a time is during night hours (22:00 - 06:00)
 */
function isNightTime(date: Date): boolean {
	const hour = date.getHours();
	return hour >= 22 || hour < 6;
}

/**
 * Check if a date is a Swedish holiday (simplified - can be enhanced)
 * TODO: Add proper Swedish holiday calculation
 */
function isHoliday(date: Date): boolean {
	// Simplified - should check against Swedish holidays
	// For now, return false
	return false;
}

/**
 * Calculate OB hours for a time period
 */
function calculateOBHours(
	start: Date,
	end: Date,
	obRates: PayrollRules['ob_rates']
): number {
	const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
	let obHours = 0;
	
	// Check each hour in the period
	const current = new Date(start);
	while (current < end) {
		const hourEnd = new Date(current);
		hourEnd.setHours(hourEnd.getHours() + 1);
		if (hourEnd > end) hourEnd.setTime(end.getTime());
		
		// Check if this hour qualifies for OB
		if (isHoliday(current) && obRates.holiday) {
			obHours += 1 * obRates.holiday;
		} else if (isWeekend(current) && obRates.weekend) {
			obHours += 1 * obRates.weekend;
		} else if (isNightTime(current) && obRates.night) {
			obHours += 1 * obRates.night;
		} else {
			obHours += 1; // Regular hour
		}
		
		current.setHours(current.getHours() + 1);
	}
	
	return obHours;
}

/**
 * Calculate break hours for a session (legacy - kept for backward compatibility)
 */
function calculateBreakHours(
	sessionHours: number,
	rules: PayrollRules
): number {
	// Auto-break: 30 min if session > 6 hours
	if (sessionHours > rules.auto_break_after_hours) {
		return rules.auto_break_duration / 60; // Convert minutes to hours
	}
	return 0;
}

/**
 * Calculate break hours per project per day
 * Rule: If work time is more than 5 hours in a project per day, discount 1 hour for breaks
 * 
 * @param entries Array of entries with project_id, check_in_ts, check_out_ts
 * @returns Total break hours for all project-day combinations
 */
function calculateBreakHoursPerProjectPerDay(
	entries: Array<{ project_id: string; check_in_ts: string; check_out_ts: string | null }>
): number {
	// Group entries by person-project-day
	const projectDayMap = new Map<string, number>(); // key: "projectId|date", value: total hours
	
	entries.forEach((entry) => {
		if (!entry.check_out_ts) {
			return; // Skip incomplete entries
		}
		
		const checkIn = new Date(entry.check_in_ts);
		const checkOut = new Date(entry.check_out_ts);
		const dateKey = checkIn.toISOString().split('T')[0]; // YYYY-MM-DD
		const projectDayKey = `${entry.project_id}|${dateKey}`;
		
		const sessionHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
		
		if (sessionHours > 0) {
			const currentHours = projectDayMap.get(projectDayKey) || 0;
			projectDayMap.set(projectDayKey, currentHours + sessionHours);
		}
	});
	
	// Calculate breaks: 1 hour per project per day if > 5 hours
	let totalBreakHours = 0;
	projectDayMap.forEach((totalHours) => {
		if (totalHours > 5) {
			totalBreakHours += 1; // 1 hour break per project per day
		}
	});
	
	return totalBreakHours;
}

/**
 * Get start of week (Monday) for a date
 */
function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday
	return new Date(d.setDate(diff));
}

/**
 * Refresh payroll basis for an organization and period
 * 
 * @param orgId Organization ID
 * @param periodStart Period start date (YYYY-MM-DD)
 * @param periodEnd Period end date (YYYY-MM-DD)
 * @param personIds Optional array of person IDs to process (if empty, processes all)
 */
export async function refreshPayrollBasis(
	orgId: string,
	periodStart: string,
	periodEnd: string,
	personIds?: string[]
): Promise<void> {
	const supabase = await createClient();
	
	// Get payroll rules
	const rules = await getPayrollRules(orgId);
	
	// Try to fetch attendance sessions, but don't fail if table doesn't exist
	// This allows the system to work even if attendance_session migration hasn't run yet
	let sessions: any[] | null = null;
	let sessionsError: any = null;
	
	try {
		const { data: existingSessions } = await supabase
			.from('attendance_session')
			.select('id')
			.eq('org_id', orgId)
			.gte('check_in_ts', `${periodStart}T00:00:00Z`)
			.lte('check_in_ts', `${periodEnd}T23:59:59Z`)
			.limit(1);
		
		// If no attendance sessions exist, try to build them from time_entries
		if (!existingSessions || existingSessions.length === 0) {
			try {
				const { buildAttendanceSessions } = await import('@/lib/jobs/attendance-builder');
				await buildAttendanceSessions({
					orgId: orgId, // Pass org_id to filter correctly
					startDate: `${periodStart}T00:00:00Z`,
					endDate: `${periodEnd}T23:59:59Z`,
				});
			} catch (buildError) {
				// Continue even if build fails - we'll fall back to time_entries
				console.warn('Failed to build attendance sessions, will use time_entries:', buildError);
			}
		}
		
		// Fetch all attendance sessions for the period
		let attendanceQuery = supabase
			.from('attendance_session')
			.select('*')
			.eq('org_id', orgId)
			.gte('check_in_ts', `${periodStart}T00:00:00Z`)
			.lte('check_in_ts', `${periodEnd}T23:59:59Z`)
			.not('check_out_ts', 'is', null); // Only completed sessions
		
		if (personIds && personIds.length > 0) {
			attendanceQuery = attendanceQuery.in('person_id', personIds);
		}
		
		const result = await attendanceQuery;
		sessions = result.data;
		sessionsError = result.error;
	} catch (tableError: any) {
		// If table doesn't exist, that's okay - we'll use time_entries instead
		console.warn('attendance_session table not available, will use time_entries:', tableError.message);
		sessions = null;
		sessionsError = null; // Don't treat missing table as an error
	}
	
	// Only throw error if table exists but query failed for another reason
	if (sessionsError && !sessionsError.message?.includes('schema cache')) {
		throw new Error(`Failed to fetch attendance sessions: ${sessionsError.message}`);
	}
	
	// Also fetch approved time_entries as fallback if no attendance_session data
	let timeEntriesQuery = supabase
		.from('time_entries')
		.select('*')
		.eq('org_id', orgId)
		.eq('status', 'approved')
		.gte('start_at', `${periodStart}T00:00:00Z`)
		.lte('start_at', `${periodEnd}T23:59:59Z`)
		.not('stop_at', 'is', null); // Only completed entries
	
	if (personIds && personIds.length > 0) {
		timeEntriesQuery = timeEntriesQuery.in('user_id', personIds);
	}
	
	const { data: timeEntries, error: timeEntriesError } = await timeEntriesQuery;
	
	if (timeEntriesError) {
		throw new Error(`Failed to fetch time entries: ${timeEntriesError.message}`);
	}
	
	// IMPORTANT: Always prioritize approved time_entries for payroll basis calculation
	// attendance_session might contain non-approved entries, so we should use approved time_entries if they exist
	const hasAttendanceData = sessions && sessions.length > 0;
	const hasTimeEntryData = timeEntries && timeEntries.length > 0;
	
	// Log what we found for debugging
	console.log(`[Payroll Basis Refresh] Found ${sessions?.length || 0} attendance sessions and ${timeEntries?.length || 0} approved time entries for period ${periodStart} to ${periodEnd}`);
	
	if (!hasAttendanceData && !hasTimeEntryData) {
		// No data to calculate from - throw error with helpful message
		throw new Error('No data found for the selected period. Please ensure there are attendance sessions or approved time entries.');
	}
	
	// Group sessions/entries by person_id ONLY (summarize for entire period, not per week)
	// According to Swedish payroll standards, löneunderlag should be summarized per worker per period
	const personSessionsMap = new Map<string, any[]>();
	
	// ALWAYS prioritize approved time_entries over attendance_session
	// This ensures we only use approved entries for payroll calculation
	if (hasTimeEntryData) {
		(timeEntries || [])
			.filter((entry: any) => entry.status === 'approved' && entry.stop_at !== null) // Double-check: only approved and completed
			.forEach((entry: any) => {
				const personId = entry.user_id;
				if (!personSessionsMap.has(personId)) {
					personSessionsMap.set(personId, []);
				}
				personSessionsMap.get(personId)!.push({
					project_id: entry.project_id,
					check_in_ts: entry.start_at,
					check_out_ts: entry.stop_at,
				});
			});
		console.log(`[Payroll Basis Refresh] Using ${timeEntries.length} approved time entries for payroll calculation`);
	} else if (hasAttendanceData) {
		// Fallback to attendance_session only if no approved time_entries exist
		(sessions || []).forEach((session: any) => {
			const personId = session.person_id;
			if (!personSessionsMap.has(personId)) {
				personSessionsMap.set(personId, []);
			}
			personSessionsMap.get(personId)!.push({
				project_id: session.project_id,
				check_in_ts: session.check_in_ts,
				check_out_ts: session.check_out_ts,
			});
		});
		console.log(`[Payroll Basis Refresh] Using ${sessions?.length || 0} attendance sessions for payroll calculation (no approved time entries found)`);
	}
	
	// Fetch salary_per_hour_sek for all persons from memberships
	const personIdsArray = Array.from(personSessionsMap.keys());
	let memberships: any[] | null = null;
	let membershipsError: any = null;
	
	if (personIdsArray.length > 0) {
		const { data, error } = await supabase
			.from('memberships')
			.select('user_id, salary_per_hour_sek')
			.eq('org_id', orgId)
			.eq('is_active', true)
			.in('user_id', personIdsArray);
		
		memberships = data;
		membershipsError = error;
	}
	
	if (membershipsError) {
		console.warn('Failed to fetch memberships for salary calculation:', membershipsError);
	}
	
	// Create a map of person_id -> salary_per_hour_sek
	const salaryMap = new Map<string, number>();
	memberships?.forEach((m: any) => {
		if (m.salary_per_hour_sek !== null && m.salary_per_hour_sek !== undefined) {
			salaryMap.set(m.user_id, Number(m.salary_per_hour_sek));
		}
	});
	
	// Calculate payroll basis for each person for the ENTIRE period
	// Swedish standard: One summary per worker per selected period
	const results: PayrollBasisResult[] = [];
	const periodStartDate = new Date(periodStart);
	const periodEndDate = new Date(periodEnd);
	
	// Calculate number of weeks in the period for overtime calculation
	const weeksInPeriod = Math.ceil((periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
	const totalNormalHoursThreshold = rules.normal_hours_threshold * weeksInPeriod;
	
	for (const [personId, sessions] of personSessionsMap.entries()) {
		// Filter sessions within the selected period
		const periodSessions = sessions.filter((session: any) => {
			const checkIn = new Date(session.check_in_ts);
			return checkIn >= periodStartDate && checkIn <= periodEndDate;
		});
		
		// Calculate break hours per project per day (new rule: 1 hour if > 5 hours per project per day)
		const totalBreakHours = calculateBreakHoursPerProjectPerDay(periodSessions);
		
		// Calculate totals for entire period
		let totalHours = 0;
		let totalOBHours = 0;
		
		periodSessions.forEach((session: any) => {
			const checkIn = new Date(session.check_in_ts);
			const checkOut = session.check_out_ts ? new Date(session.check_out_ts) : null;
			
			if (!checkOut) {
				// Skip incomplete sessions/entries
				return;
			}
			
			const sessionHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
			
			// Only count positive hours
			if (sessionHours > 0) {
				totalHours += sessionHours;
				totalOBHours += calculateOBHours(checkIn, checkOut, rules.ob_rates);
			}
		});
		
		// Calculate overtime based on total hours for the entire period
		// Swedish standard: Övertid = total timmar - (normal timmar/vecka × antal veckor)
		const netHours = totalHours - totalBreakHours;
		const hoursNorm = Math.min(netHours, totalNormalHoursThreshold);
		const hoursOvertime = Math.max(0, netHours - totalNormalHoursThreshold);
		
		// Calculate gross salary
		// Formula: (normaltid × timlön) + (övertid × timlön × övertidsmultiplikator) + (OB-timmar × timlön × OB-tillägg)
		const salaryPerHour = salaryMap.get(personId) || 0;
		let grossSalary = 0;
		
		console.log(`[Payroll Basis Refresh] Calculating gross salary for person ${personId}: salaryPerHour=${salaryPerHour}, hoursNorm=${hoursNorm}, hoursOvertime=${hoursOvertime}, totalOBHours=${totalOBHours}`);
		
		if (salaryPerHour > 0) {
			// Normal hours: hours_norm × salary_per_hour_sek
			grossSalary += hoursNorm * salaryPerHour;
			
			// Overtime hours: hours_overtime × salary_per_hour_sek × overtime_multiplier
			grossSalary += hoursOvertime * salaryPerHour * rules.overtime_multiplier;
			
			// OB hours: Calculate average OB rate from rules
			// OB-tillägg är ett procentuellt tillägg på grundlönen
			// Vi använder genomsnittlig OB-rate om flera är satta, annars 0
			const obRatesArray = [
				rules.ob_rates.night,
				rules.ob_rates.weekend,
				rules.ob_rates.holiday,
			].filter((rate): rate is number => rate !== undefined && rate !== null);
			
			const avgOBRate = obRatesArray.length > 0
				? obRatesArray.reduce((sum, rate) => sum + rate, 0) / obRatesArray.length
				: 0;
			
			// OB-tillägg: ob_hours × salary_per_hour_sek × avgOBRate
			// OBS: ob_hours är timmar som jobbats under OB-tid
			// OB-timmarna kan överlappa med normal tid eller övertid, så vi lägger bara till tillägget
			// Grundlönen för OB-timmarna redan ingår i normal tid/övertid
			if (totalOBHours > 0 && avgOBRate > 0) {
				grossSalary += totalOBHours * salaryPerHour * avgOBRate;
			}
			
			console.log(`[Payroll Basis Refresh] Calculated gross salary: ${grossSalary.toFixed(2)} SEK`);
		} else {
			console.log(`[Payroll Basis Refresh] No salary_per_hour_sek set for person ${personId}, gross salary will be 0`);
		}
		
		// Create ONE result per person for the entire selected period
		results.push({
			person_id: personId,
			period_start: periodStart,
			period_end: periodEnd,
			hours_norm: Number(hoursNorm.toFixed(2)),
			hours_overtime: Number(hoursOvertime.toFixed(2)),
			ob_hours: Number(totalOBHours.toFixed(2)),
			break_hours: Number(totalBreakHours.toFixed(2)),
			total_hours: Number(netHours.toFixed(2)),
			gross_salary_sek: Number(grossSalary.toFixed(2)),
		});
	}
	
	// Upsert payroll_basis records
	if (results.length === 0) {
		console.warn(`No payroll basis results calculated. Found ${sessions?.length || 0} attendance sessions and ${timeEntries?.length || 0} approved time entries.`);
		throw new Error('No payroll basis could be calculated. Ensure there are approved time entries or attendance sessions for the period.');
	}

	// Delete existing payroll_basis entries for this period before inserting new ones
	// This ensures we replace weekly entries with period-summarized entries
	await supabase
		.from('payroll_basis')
		.delete()
		.eq('org_id', orgId)
		.gte('period_start', periodStart)
		.lte('period_end', periodEnd);
	
		// Insert new summarized entries (one per person per period)
		for (const result of results) {
			const { error: upsertError } = await supabase
				.from('payroll_basis')
				.insert({
					org_id: orgId,
					person_id: result.person_id,
					period_start: result.period_start,
					period_end: result.period_end,
					hours_norm: result.hours_norm,
					hours_overtime: result.hours_overtime,
					ob_hours: result.ob_hours,
					break_hours: result.break_hours,
					total_hours: result.total_hours,
					gross_salary_sek: result.gross_salary_sek,
					locked: false, // Reset lock when recalculating
					locked_by: null,
					locked_at: null,
				});
		
		if (upsertError) {
			console.error(`Failed to insert payroll basis for ${result.person_id}:`, upsertError);
			throw new Error(`Failed to save payroll basis: ${upsertError.message}`);
		}
	}

	console.log(`Successfully calculated and saved ${results.length} payroll basis records for period ${periodStart} to ${periodEnd}`);
}

