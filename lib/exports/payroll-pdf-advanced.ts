/**
 * EPIC 33: Advanced Payroll PDF Generator
 * 
 * Generates professional payroll basis PDF for Swedish construction industry
 * Designed for Fortnox PAXml / Visma-lönearter export mapping
 * 
 * Features:
 * - Complete attestation chain (signature chain)
 * - Detailed wage type rows (löneart-rader)
 * - Project breakdown with subtotals
 * - Compliance checklist for deviations
 * - Masked personal numbers for privacy
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';

// Types for wage type rows (löneart-rader)
export interface WageTypeRow {
	date: string; // YYYY-MM-DD
	project_id: string | null;
	project_name: string | null;
	project_number: string | null;
	id06: string | null; // ID06 number for construction industry
	employment_type: string | null; // Anställningstyp (e.g., "Anställd", "Konsult")
	source: string | null; // Källa: Dagbok#/Foto#/Personalliggare#
	standby_oncall: boolean; // Beredskap/Jour (Ja/Nej)
	wage_type_code: string; // System code (e.g., "OB_KVALL", "OT_ENKEL", "VADERHINDER_BETALD")
	wage_type_name: string; // Display name (e.g., "OB Kväll", "Övertid Enkel", "Väderhindertid Betald")
	quantity: number; // Hours, pieces, km, days
	unit: 'h' | 'st' | 'km' | 'dygn';
	unit_price_sek: number; // SEK per unit
	amount_sek: number; // Total amount
	cost_center: string | null; // For PAXml/varugrupp mapping
	comment: string; // Source: Time entry ID, Diary entry, Expense photo ID
	attest_status: 'OK' | 'Avvisad' | 'Ändrad';
	signature: string; // Initials or name
}

export interface PayrollPDFData {
	// Organization info
	organization: {
		name: string;
		org_number: string | null;
		address: string | null;
		postal_code: string | null;
		city: string | null;
	};
	
	// Document metadata
	period_start: string;
	period_end: string;
	generated_at: string;
	version: string;
	export_target: 'Fortnox PAXml' | 'Visma Lön' | 'Both';
	
	// Attestation chain
	attestation: {
		created_by: { name: string; timestamp: string } | null;
		reviewed_by: { name: string; timestamp: string } | null;
		attested_by: { name: string; timestamp: string } | null;
		locked: boolean;
	};
	
	// Employee card
	employee: {
		name: string;
		personal_number: string; // Will be masked in PDF
		employment_type: string; // e.g., "Tillsvidare", "Vikariat"
		hourly_rate_sek: number | null;
		monthly_salary_sek: number | null;
		agreement: string; // e.g., "Byggavtalet"
		cost_center: string | null;
		occupation_group: string | null; // Yrkesgrupp/BYN-nivå
		piecework_active: boolean; // Ackord aktivt (Ja/Nej)
		driver: boolean; // Förare (Ja/Nej)
	};
	
	// Summary (Översikt)
	summary: {
		ordinary_hours: number; // Ordinarie tid
		part_time_hours: number; // Mertid (if part-time)
		overtime_simple: number; // Övertid Enkel
		overtime_qualified: number; // Övertid Kvalificerad
		ob_evening: number; // OB Kväll
		ob_night: number; // OB Natt
		ob_weekend: number; // OB Helg
		ob_major_holiday: number; // OB Storhelg
		shift_ob: number; // Skift-OB (2/3-skift)
		weather_hindrance_paid: number; // Väderhindertid Betald
		weather_hindrance_unpaid: number; // Väderhindertid Obetald
		travel_time: number; // Restid (R-tid)
		standby: number; // Beredskap
		dispatch: number; // Utryckning
		piecework: number; // Ackord
		absence_sick: number; // Frånvaro Sjuk
		absence_vab: number; // Frånvaro VAB
		absence_vacation: number; // Frånvaro Semester
		absence_leave: number; // Frånvaro Tjänstledig
		break_hours: number; // Raster
		travel_allowance_domestic_full: number; // Traktamente Inrikes Hel
		travel_allowance_domestic_half: number; // Traktamente Inrikes Halv
		travel_allowance_foreign_full: number; // Traktamente Utrikes Hel
		travel_allowance_foreign_half: number; // Traktamente Utrikes Halv
		mileage_allowance: number; // Milersättning (SEK)
		passenger_allowance: number; // Passagerarersättning (SEK)
		expenses: number; // Utlägg (SEK)
		total_worked_hours: number; // Total arbetad tid
		total_gross_salary_sek: number; // Total bruttolön
	};
	
	// Wage type rows (detailed list)
	wage_type_rows: WageTypeRow[];
	
	// Project breakdown (subtotals per project)
	project_breakdown: Array<{
		project_id: string;
		project_name: string;
		project_number: string | null;
		wage_types: Array<{
			wage_type_code: string;
			wage_type_name: string;
			total_hours: number;
			total_amount_sek: number;
		}>;
		total_hours: number;
		total_amount_sek: number;
	}>;
	
	// Top 5 deviating days
	deviating_days: Array<{
		date: string;
		hours: number;
		reason: string; // "> 10h", "< 3h", "Saknad rast"
	}>;
	
	// Compliance checklist
	compliance_warnings: Array<{
		type: 'OB_WITHOUT_PROJECT' | 'OVERTIME_EXCESSIVE' | 'MISSING_WEEKLY_REST' | 'OVERLAPPING_SHIFTS' | 'TIME_WITHOUT_PROJECT_OR_ID06' | 'WEATHER_HINDRANCE_WITHOUT_SOURCE' | 'STANDBY_WITHOUT_DISPATCH' | 'TRAVEL_TIME_EXCESSIVE' | 'PIECEWORK_WITHOUT_PROJECT';
		description: string;
		affected_rows: number[]; // Indices in wage_type_rows
		severity: 'warning' | 'info';
	}>;
}

/**
 * Mask personal number for display in PDF
 * Format: YYMMDD-XXXX → YYMMDD-****
 */
export function maskPersonalNumber(personalNumber: string | null): string {
	if (!personalNumber) return 'Ej angivet';
	
	// Remove any non-digit characters except dash
	const cleaned = personalNumber.replace(/[^\d-]/g, '');
	
	// If format is YYMMDD-XXXX, mask last 4 digits
	if (cleaned.includes('-')) {
		const [datePart, numberPart] = cleaned.split('-');
		if (numberPart && numberPart.length >= 4) {
			return `${datePart}-****`;
		}
	}
	
	// If no dash, mask last 4 digits
	if (cleaned.length >= 10) {
		return `${cleaned.slice(0, 6)}-****`;
	}
	
	return 'Ej angivet';
}

/**
 * Generate wage type rows from payroll basis data
 * This creates detailed rows for each OB/overtime/absence type per project/day
 */
export async function generateWageTypeRows(
	orgId: string,
	personId: string,
	periodStart: string,
	periodEnd: string
): Promise<WageTypeRow[]> {
	const supabaseServer = await createClient();
	const supabase = createAdminClient();
	const rows: WageTypeRow[] = [];
	
	// Try to fetch attendance sessions first (primary source for payroll)
	let attendanceSessions: any[] | null = null;
	try {
		const { data: sessions } = await supabase
			.from('attendance_session')
			.select(`
				id,
				check_in_ts,
				check_out_ts,
				project_id,
				project:projects(name, project_number),
				person_id
			`)
			.eq('org_id', orgId)
			.eq('person_id', personId) // attendance_session uses person_id, not user_id
			.gte('check_in_ts', `${periodStart}T00:00:00Z`)
			.lte('check_in_ts', `${periodEnd}T23:59:59Z`)
			.not('check_out_ts', 'is', null)
			.order('check_in_ts', { ascending: true });
		
		attendanceSessions = sessions;
	} catch (error) {
		console.warn('Could not fetch attendance_session, trying time_entries:', error);
	}
	
	// Fallback to time_entries if no attendance sessions
	let timeEntries: any[] | null = null;
	if (!attendanceSessions || attendanceSessions.length === 0) {
		const { data: entries } = await supabase
			.from('time_entries')
			.select(`
				id,
				start_at,
				stop_at,
				project_id,
				project:projects(name, project_number),
				approved_by,
				approved_at,
				status
			`)
			.eq('org_id', orgId)
			.eq('user_id', personId)
			.eq('status', 'approved')
			.gte('start_at', `${periodStart}T00:00:00Z`)
			.lte('start_at', `${periodEnd}T23:59:59Z`)
			.not('stop_at', 'is', null)
			.order('start_at', { ascending: true });
		
		timeEntries = entries;
	}
	
	// Use attendance sessions if available, otherwise use time entries
	const sourceEntries = attendanceSessions && attendanceSessions.length > 0 
		? attendanceSessions.map(s => ({
			id: s.id,
			start_at: s.check_in_ts,
			stop_at: s.check_out_ts,
			project_id: s.project_id,
			project: s.project,
			approved_by: null,
			approved_at: null,
			status: 'approved'
		}))
		: (timeEntries || []);
	
	if (!sourceEntries || sourceEntries.length === 0) {
		// If no entries found, return empty array - summary will be created from payroll_basis
		return rows;
	}
	
	// Get payroll rules
	const { data: rules } = await supabaseServer
		.from('payroll_rules')
		.select('*')
		.eq('org_id', orgId)
		.single();
	
	const obRates = rules?.ob_rates || { night: 1.2, weekend: 1.5, holiday: 2.0 };
	const hourlyRate = rules?.overtime_multiplier || 1.5;
	
	// Get employee hourly rate
	const { data: membership } = await supabaseServer
		.from('memberships')
		.select('salary_per_hour_sek')
		.eq('org_id', orgId)
		.eq('user_id', personId)
		.single();
	
	const baseHourlyRate = membership?.salary_per_hour_sek || 0;
	
	// Process each entry and create wage type rows
	for (const entry of sourceEntries) {
		const start = new Date(entry.start_at);
		const stop = entry.stop_at ? new Date(entry.stop_at) : null;
		
		if (!stop) continue;
		
		const date = start.toISOString().split('T')[0];
		const project = entry.project as any;
		const hours = (stop.getTime() - start.getTime()) / (1000 * 60 * 60);
		
		// Determine OB type for each hour
		const obHours = {
			evening: 0, // 18:00-22:00
			night: 0,   // 22:00-06:00
			weekend: 0, // Saturday/Sunday
			holiday: 0, // Swedish holidays
		};
		
		// Calculate OB hours by iterating through each hour
		const current = new Date(start);
		while (current < stop) {
			const hourEnd = new Date(current);
			hourEnd.setHours(hourEnd.getHours() + 1);
			if (hourEnd > stop) hourEnd.setTime(stop.getTime());
			
			const hour = current.getHours();
			const day = current.getDay();
			const isWeekend = day === 0 || day === 6;
			const isHoliday = false; // TODO: Implement Swedish holiday check
			
			if (isHoliday) {
				obHours.holiday += 1;
			} else if (isWeekend) {
				obHours.weekend += 1;
			} else if (hour >= 22 || hour < 6) {
				obHours.night += 1;
			} else if (hour >= 18 && hour < 22) {
				obHours.evening += 1;
			}
			
			current.setHours(current.getHours() + 1);
		}
		
		// Create OB rows
		// Get ID06 and employment type from project or membership
		// TODO: Fetch actual ID06 from project settings or membership
		const id06 = project?.id06 || null;
		const employmentType = 'Anställd'; // TODO: Fetch from membership
		const source = `Tidrapport#${entry.id.substring(0, 8)}`;
		const standbyOncall = false; // TODO: Check if entry has standby/oncall flag
		
		if (obHours.evening > 0) {
			rows.push({
				date,
				project_id: entry.project_id,
				project_name: project?.name || null,
				project_number: project?.project_number || null,
				id06,
				employment_type: employmentType,
				source,
				standby_oncall: standbyOncall,
				wage_type_code: 'OB_KVALL',
				wage_type_name: 'OB Kväll',
				quantity: obHours.evening,
				unit: 'h',
				unit_price_sek: baseHourlyRate * (obRates.evening || 1.2),
				amount_sek: obHours.evening * baseHourlyRate * (obRates.evening || 1.2),
				cost_center: project?.project_number || null,
				comment: `Tidrapport ${entry.id.substring(0, 8)}`,
				attest_status: 'OK',
				signature: entry.approved_by ? 'G' : '', // G = Godkänd
			});
		}
		
		if (obHours.night > 0) {
			rows.push({
				date,
				project_id: entry.project_id,
				project_name: project?.name || null,
				project_number: project?.project_number || null,
				id06,
				employment_type: employmentType,
				source,
				standby_oncall: standbyOncall,
				wage_type_code: 'OB_NATT',
				wage_type_name: 'OB Natt',
				quantity: obHours.night,
				unit: 'h',
				unit_price_sek: baseHourlyRate * (obRates.night || 1.2),
				amount_sek: obHours.night * baseHourlyRate * (obRates.night || 1.2),
				cost_center: project?.project_number || null,
				comment: `Tidrapport ${entry.id.substring(0, 8)}`,
				attest_status: 'OK',
				signature: entry.approved_by ? 'G' : '',
			});
		}
		
		if (obHours.weekend > 0) {
			rows.push({
				date,
				project_id: entry.project_id,
				project_name: project?.name || null,
				project_number: project?.project_number || null,
				id06,
				employment_type: employmentType,
				source,
				standby_oncall: standbyOncall,
				wage_type_code: 'OB_HELG',
				wage_type_name: 'OB Helg',
				quantity: obHours.weekend,
				unit: 'h',
				unit_price_sek: baseHourlyRate * (obRates.weekend || 1.5),
				amount_sek: obHours.weekend * baseHourlyRate * (obRates.weekend || 1.5),
				cost_center: project?.project_number || null,
				comment: `Tidrapport ${entry.id.substring(0, 8)}`,
				attest_status: 'OK',
				signature: entry.approved_by ? 'G' : '',
			});
		}
		
		// Calculate regular hours (total - OB hours)
		const totalOBHours = obHours.evening + obHours.night + obHours.weekend + obHours.holiday;
		const regularHours = Math.max(0, hours - totalOBHours);
		
		// TODO: Calculate overtime (hours > 40/week)
		// For now, add regular hours row
		if (regularHours > 0) {
			rows.push({
				date,
				project_id: entry.project_id,
				project_name: project?.name || null,
				project_number: project?.project_number || null,
				id06,
				employment_type: employmentType,
				source,
				standby_oncall: standbyOncall,
				wage_type_code: 'ORDINARIE',
				wage_type_name: 'Ordinarie tid',
				quantity: regularHours,
				unit: 'h',
				unit_price_sek: baseHourlyRate,
				amount_sek: regularHours * baseHourlyRate,
				cost_center: project?.project_number || null,
				comment: `Tidrapport ${entry.id.substring(0, 8)}`,
				attest_status: 'OK',
				signature: entry.approved_by ? 'G' : '',
			});
		}
	}
	
	return rows;
}

/**
 * Collect all data needed for PDF generation
 */
export async function collectPayrollPDFData(
	orgId: string,
	personId: string,
	periodStart: string,
	periodEnd: string,
	exportTarget: 'Fortnox PAXml' | 'Visma Lön' | 'Both' = 'Both'
): Promise<PayrollPDFData> {
	const supabase = await createClient();
	
	// Fetch organization
	const { data: org } = await supabase
		.from('organizations')
		.select('name, org_number, address, postal_code, city')
		.eq('id', orgId)
		.single();
	
	// Fetch employee profile and membership
	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name, email')
		.eq('id', personId)
		.single();
	
	const { data: membership } = await supabase
		.from('memberships')
		.select('salary_per_hour_sek, hourly_rate_sek')
		.eq('org_id', orgId)
		.eq('user_id', personId)
		.single();
	
	// Fetch payroll basis - fix period filtering: find records that overlap with requested period
	// For overlap: period_start <= periodEnd AND period_end >= periodStart
	const { data: payrollBasis, error: payrollBasisError } = await supabase
		.from('payroll_basis')
		.select('*, locked_by, locked_at')
		.eq('org_id', orgId)
		.eq('person_id', personId)
		.lte('period_start', periodEnd)
		.gte('period_end', periodStart)
		.order('period_start', { ascending: false })
		.limit(1)
		.maybeSingle();
	
	if (payrollBasisError) {
		console.warn('Error fetching payroll_basis for PDF:', payrollBasisError);
		// Continue without payroll_basis - we'll use wage type rows only
	}
	
	// Use payroll basis period if available (handles periods that span different dates than requested)
	const effectivePeriodStart = payrollBasis?.period_start || periodStart;
	const effectivePeriodEnd = payrollBasis?.period_end || periodEnd;
	
	// Generate wage type rows
	const wageTypeRows = await generateWageTypeRows(orgId, personId, effectivePeriodStart, effectivePeriodEnd);
	
	// If no wage type rows exist but we have payroll_basis data, create rows from it
	let finalWageTypeRows = wageTypeRows;
	if (wageTypeRows.length === 0 && payrollBasis) {
		// Fallback: Create wage type rows from payroll_basis aggregated data
		finalWageTypeRows = createWageTypeRowsFromPayrollBasis(payrollBasis, membership?.salary_per_hour_sek || 0);
	}
	
	// If no wage type rows exist but we have payroll_basis data, create summary from it
	let summary: PayrollPDFData['summary'];
	if (finalWageTypeRows.length === 0 && payrollBasis) {
		// Fallback: Create summary from payroll_basis aggregated data
		summary = createSummaryFromPayrollBasis(payrollBasis);
	} else {
		summary = calculateSummaryFromRows(finalWageTypeRows, payrollBasis);
	}
	
	// Calculate project breakdown
	const projectBreakdown = calculateProjectBreakdown(finalWageTypeRows);
	
	// Find deviating days
	const deviatingDays = findDeviatingDays(finalWageTypeRows);
	
	// Check compliance
	const complianceWarnings = checkCompliance(finalWageTypeRows);
	
	// Fetch locked by name if available
	let lockedByName: string | null = null;
	if (payrollBasis?.locked_by) {
		const { data: lockedProfile } = await supabase
			.from('profiles')
			.select('full_name')
			.eq('id', payrollBasis.locked_by)
			.single();
		lockedByName = lockedProfile?.full_name || null;
	}
	
	// Get attestation chain
	const attestation = {
		created_by: payrollBasis ? {
			name: 'System',
			timestamp: payrollBasis.created_at,
		} : null,
		reviewed_by: null,
		attested_by: payrollBasis?.locked_by ? {
			name: lockedByName || 'Okänd',
			timestamp: payrollBasis.locked_at || '',
		} : null,
		locked: payrollBasis?.locked || false,
	};
	
	return {
		organization: {
			name: org?.name || 'Okänt bolag',
			org_number: org?.org_number || null,
			address: org?.address || null,
			postal_code: org?.postal_code || null,
			city: org?.city || null,
		},
		period_start: periodStart,
		period_end: periodEnd,
		generated_at: new Date().toISOString(),
		version: '1.0',
		export_target: exportTarget,
		attestation,
		employee: {
			name: profile?.full_name || 'Okänd',
			personal_number: '', // TODO: Add personal_number to profiles table
			employment_type: 'Tillsvidare', // TODO: Add to memberships
			hourly_rate_sek: membership?.salary_per_hour_sek || membership?.hourly_rate_sek || null,
			monthly_salary_sek: null, // TODO: Add monthly salary option
			agreement: 'Byggavtalet', // TODO: Make configurable
			cost_center: null,
			occupation_group: null, // TODO: Add Yrkesgrupp/BYN-nivå to memberships
			piecework_active: false, // TODO: Check if employee has active piecework project
			driver: false, // TODO: Add driver flag to memberships
		},
		summary,
		wage_type_rows: finalWageTypeRows,
		project_breakdown: projectBreakdown,
		deviating_days: deviatingDays,
		compliance_warnings: complianceWarnings,
	};
}

/**
 * Create wage type rows from payroll_basis aggregated data (fallback when no detailed rows exist)
 */
function createWageTypeRowsFromPayrollBasis(payrollBasis: any, baseHourlyRate: number): WageTypeRow[] {
	const rows: WageTypeRow[] = [];
	const periodStart = payrollBasis.period_start;
	const periodEnd = payrollBasis.period_end;
	
	// Create rows for ordinary hours
	if (payrollBasis.hours_norm && Number(payrollBasis.hours_norm) > 0) {
		rows.push({
			date: periodStart, // Use period start as date
			project_id: null,
			project_name: 'Sammanfattning',
			project_number: null,
			id06: null,
			employment_type: 'Anställd',
			source: 'Löneunderlag',
			standby_oncall: false,
			wage_type_code: 'ORDINARIE',
			wage_type_name: 'Ordinarie tid',
			quantity: Number(payrollBasis.hours_norm),
			unit: 'h',
			unit_price_sek: baseHourlyRate,
			amount_sek: Number(payrollBasis.hours_norm) * baseHourlyRate,
			cost_center: null,
			comment: `Period: ${periodStart} - ${periodEnd}`,
			attest_status: payrollBasis.locked ? 'OK' : 'Ändrad',
			signature: payrollBasis.locked ? 'G' : '',
		});
	}
	
	// Create rows for overtime
	if (payrollBasis.hours_overtime && Number(payrollBasis.hours_overtime) > 0) {
		rows.push({
			date: periodStart,
			project_id: null,
			project_name: 'Sammanfattning',
			project_number: null,
			id06: null,
			employment_type: 'Anställd',
			source: 'Löneunderlag',
			standby_oncall: false,
			wage_type_code: 'OVERTID_KVAL',
			wage_type_name: 'Övertid Kvalificerad',
			quantity: Number(payrollBasis.hours_overtime),
			unit: 'h',
			unit_price_sek: baseHourlyRate * 1.5, // Standard overtime multiplier
			amount_sek: Number(payrollBasis.hours_overtime) * baseHourlyRate * 1.5,
			cost_center: null,
			comment: `Period: ${periodStart} - ${periodEnd}`,
			attest_status: payrollBasis.locked ? 'OK' : 'Ändrad',
			signature: payrollBasis.locked ? 'G' : '',
		});
	}
	
	// Create rows for OB hours
	if (payrollBasis.ob_hours && Number(payrollBasis.ob_hours) > 0) {
		rows.push({
			date: periodStart,
			project_id: null,
			project_name: 'Sammanfattning',
			project_number: null,
			id06: null,
			employment_type: 'Anställd',
			source: 'Löneunderlag',
			standby_oncall: false,
			wage_type_code: 'OB_STORHELG',
			wage_type_name: 'OB Storhelg',
			quantity: Number(payrollBasis.ob_hours),
			unit: 'h',
			unit_price_sek: baseHourlyRate * 2.0, // Standard OB multiplier
			amount_sek: Number(payrollBasis.ob_hours) * baseHourlyRate * 2.0,
			cost_center: null,
			comment: `Period: ${periodStart} - ${periodEnd}`,
			attest_status: payrollBasis.locked ? 'OK' : 'Ändrad',
			signature: payrollBasis.locked ? 'G' : '',
		});
	}
	
	return rows;
}

/**
 * Create summary from payroll_basis aggregated data (fallback when no wage type rows exist)
 */
function createSummaryFromPayrollBasis(payrollBasis: any): PayrollPDFData['summary'] {
	return {
		ordinary_hours: Number(payrollBasis.hours_norm) || 0,
		part_time_hours: 0,
		overtime_simple: 0,
		overtime_qualified: Number(payrollBasis.hours_overtime) || 0,
		ob_evening: 0,
		ob_night: 0,
		ob_weekend: 0,
		ob_major_holiday: Number(payrollBasis.ob_hours) || 0, // Approximate: all OB hours
		shift_ob: 0,
		weather_hindrance_paid: 0,
		weather_hindrance_unpaid: 0,
		travel_time: 0,
		standby: 0,
		dispatch: 0,
		piecework: 0,
		absence_sick: 0,
		absence_vab: 0,
		absence_vacation: 0,
		absence_leave: 0,
		break_hours: Number(payrollBasis.break_hours) || 0,
		travel_allowance_domestic_full: 0,
		travel_allowance_domestic_half: 0,
		travel_allowance_foreign_full: 0,
		travel_allowance_foreign_half: 0,
		mileage_allowance: 0,
		passenger_allowance: 0,
		expenses: 0,
		total_worked_hours: Number(payrollBasis.total_hours) || 0,
		total_gross_salary_sek: Number(payrollBasis.gross_salary_sek) || 0,
	};
}

/**
 * Calculate summary from wage type rows
 */
function calculateSummaryFromRows(rows: WageTypeRow[], payrollBasis: any): PayrollPDFData['summary'] {
	const summary: PayrollPDFData['summary'] = {
		ordinary_hours: 0,
		part_time_hours: 0,
		overtime_simple: 0,
		overtime_qualified: 0,
		ob_evening: 0,
		ob_night: 0,
		ob_weekend: 0,
		ob_major_holiday: 0,
		shift_ob: 0,
		weather_hindrance_paid: 0,
		weather_hindrance_unpaid: 0,
		travel_time: 0,
		standby: 0,
		dispatch: 0,
		piecework: 0,
		absence_sick: 0,
		absence_vab: 0,
		absence_vacation: 0,
		absence_leave: 0,
		break_hours: payrollBasis?.break_hours || 0,
		travel_allowance_domestic_full: 0,
		travel_allowance_domestic_half: 0,
		travel_allowance_foreign_full: 0,
		travel_allowance_foreign_half: 0,
		mileage_allowance: 0,
		passenger_allowance: 0,
		expenses: 0,
		total_worked_hours: payrollBasis?.total_hours || 0,
		total_gross_salary_sek: payrollBasis?.gross_salary_sek || 0,
	};
	
	rows.forEach((row) => {
		if (row.unit === 'h') {
			switch (row.wage_type_code) {
				case 'ORDINARIE':
					summary.ordinary_hours += row.quantity;
					break;
				case 'OB_KVALL':
					summary.ob_evening += row.quantity;
					break;
				case 'OB_NATT':
					summary.ob_night += row.quantity;
					break;
				case 'OB_HELG':
					summary.ob_weekend += row.quantity;
					break;
				case 'OB_STORHELG':
					summary.ob_major_holiday += row.quantity;
					break;
				case 'SKIFT_OB':
					summary.shift_ob += row.quantity;
					break;
				case 'VADERHINDER_BETALD':
					summary.weather_hindrance_paid += row.quantity;
					break;
				case 'VADERHINDER_OBETALD':
					summary.weather_hindrance_unpaid += row.quantity;
					break;
				case 'RESTID':
					summary.travel_time += row.quantity;
					break;
				case 'BEREDSKAP':
					summary.standby += row.quantity;
					break;
				case 'UTRYCKNING':
					summary.dispatch += row.quantity;
					break;
				case 'ACKORD':
					summary.piecework += row.quantity;
					break;
				case 'OT_ENKEL':
					summary.overtime_simple += row.quantity;
					break;
				case 'OT_KVAL':
					summary.overtime_qualified += row.quantity;
					break;
				case 'FRANVARO_SJUK':
					summary.absence_sick += row.quantity;
					break;
				case 'FRANVARO_VAB':
					summary.absence_vab += row.quantity;
					break;
				case 'FRANVARO_SEMESTER':
					summary.absence_vacation += row.quantity;
					break;
				case 'FRANVARO_TJANSTLEDIG':
					summary.absence_leave += row.quantity;
					break;
			}
		} else if (row.unit === 'st' || row.unit === 'dygn') {
			// Handle travel allowances, mileage, etc.
			switch (row.wage_type_code) {
				case 'TRAKTAMENTE_INRIKES_HEL':
					summary.travel_allowance_domestic_full += row.amount_sek;
					break;
				case 'TRAKTAMENTE_INRIKES_HALV':
					summary.travel_allowance_domestic_half += row.amount_sek;
					break;
				case 'TRAKTAMENTE_UTRIKES_HEL':
					summary.travel_allowance_foreign_full += row.amount_sek;
					break;
				case 'TRAKTAMENTE_UTRIKES_HALV':
					summary.travel_allowance_foreign_half += row.amount_sek;
					break;
				case 'MILERSATTNING':
					summary.mileage_allowance += row.amount_sek;
					break;
				case 'PASSAGERARERSATTNING':
					summary.passenger_allowance += row.amount_sek;
					break;
			}
		}
	});
	
	return summary;
}

/**
 * Calculate project breakdown with subtotals
 */
function calculateProjectBreakdown(rows: WageTypeRow[]): PayrollPDFData['project_breakdown'] {
	const projectMap = new Map<string, {
		project_id: string;
		project_name: string;
		project_number: string | null;
		wageTypes: Map<string, { hours: number; amount: number }>;
		totalHours: number;
		totalAmount: number;
	}>();
	
	rows.forEach((row) => {
		const projectKey = row.project_id || 'no-project';
		const projectName = row.project_name || 'Inget projekt';
		
		if (!projectMap.has(projectKey)) {
			projectMap.set(projectKey, {
				project_id: row.project_id || '',
				project_name: projectName,
				project_number: row.project_number,
				wageTypes: new Map(),
				totalHours: 0,
				totalAmount: 0,
			});
		}
		
		const project = projectMap.get(projectKey)!;
		
		if (!project.wageTypes.has(row.wage_type_code)) {
			project.wageTypes.set(row.wage_type_code, { hours: 0, amount: 0 });
		}
		
		const wageType = project.wageTypes.get(row.wage_type_code)!;
		wageType.hours += row.quantity;
		wageType.amount += row.amount_sek;
		project.totalHours += row.quantity;
		project.totalAmount += row.amount_sek;
	});
	
	return Array.from(projectMap.values()).map((project) => ({
		project_id: project.project_id,
		project_name: project.project_name,
		project_number: project.project_number,
		wage_types: Array.from(project.wageTypes.entries()).map(([code, data]) => ({
			wage_type_code: code,
			wage_type_name: getWageTypeName(code),
			total_hours: data.hours,
			total_amount_sek: data.amount,
		})),
		total_hours: project.totalHours,
		total_amount_sek: project.totalAmount,
	}));
}

/**
 * Get wage type display name
 */
function getWageTypeName(code: string): string {
	const names: Record<string, string> = {
		'ORDINARIE': 'Ordinarie tid',
		'OB_KVALL': 'OB Kväll',
		'OB_NATT': 'OB Natt',
		'OB_HELG': 'OB Helg',
		'OT_ENKEL': 'Övertid Enkel',
		'OT_KVAL': 'Övertid Kvalificerad',
		'FRANVARO_SJUK': 'Frånvaro Sjuk',
		'FRANVARO_VAB': 'Frånvaro VAB',
		'FRANVARO_SEMESTER': 'Frånvaro Semester',
		'FRANVARO_TJANSTLEDIG': 'Frånvaro Tjänstledig',
	};
	return names[code] || code;
}

/**
 * Find deviating days (> 10h, < 3h, or missing break)
 */
function findDeviatingDays(rows: WageTypeRow[]): PayrollPDFData['deviating_days'] {
	const dayMap = new Map<string, number>();
	
	rows.forEach((row) => {
		if (row.unit === 'h') {
			const current = dayMap.get(row.date) || 0;
			dayMap.set(row.date, current + row.quantity);
		}
	});
	
	const deviating: PayrollPDFData['deviating_days'] = [];
	
	dayMap.forEach((hours, date) => {
		if (hours > 10) {
			deviating.push({ date, hours, reason: `> 10h (${hours.toFixed(1)}h)` });
		} else if (hours < 3 && hours > 0) {
			deviating.push({ date, hours, reason: `< 3h (${hours.toFixed(1)}h)` });
		}
		// TODO: Check for missing breaks
	});
	
	return deviating.slice(0, 5); // Top 5
}

/**
 * Check compliance and generate warnings
 */
function checkCompliance(rows: WageTypeRow[]): PayrollPDFData['compliance_warnings'] {
	const warnings: PayrollPDFData['compliance_warnings'] = [];
	
	// Check for time without project or ID06
	const timeWithoutProjectOrID06: number[] = [];
	rows.forEach((row, index) => {
		if (row.unit === 'h' && !row.project_id && !row.id06) {
			timeWithoutProjectOrID06.push(index);
		}
	});
	if (timeWithoutProjectOrID06.length > 0) {
		warnings.push({
			type: 'TIME_WITHOUT_PROJECT_OR_ID06',
			description: `${timeWithoutProjectOrID06.length} tidsregistreringar saknar projekt eller ID06`,
			affected_rows: timeWithoutProjectOrID06,
			severity: 'warning',
		});
	}
	
	// Check for weather hindrance without source
	const weatherWithoutSource: number[] = [];
	rows.forEach((row, index) => {
		if (
			(row.wage_type_code === 'VADERHINDER_BETALD' ||
				row.wage_type_code === 'VADERHINDER_OBETALD') &&
			!row.source
		) {
			weatherWithoutSource.push(index);
		}
	});
	if (weatherWithoutSource.length > 0) {
		warnings.push({
			type: 'WEATHER_HINDRANCE_WITHOUT_SOURCE',
			description: `${weatherWithoutSource.length} väderhindertider saknar källa (Dagbok/Foto/Personalliggare)`,
			affected_rows: weatherWithoutSource,
			severity: 'warning',
		});
	}
	
	// Check for standby without dispatch
	const standbyWithoutDispatch: number[] = [];
	const standbyRows = rows.filter((r) => r.wage_type_code === 'BEREDSKAP');
	const dispatchRows = rows.filter((r) => r.wage_type_code === 'UTRYCKNING');
	standbyRows.forEach((row, index) => {
		const hasDispatch = dispatchRows.some(
			(dr) => dr.date === row.date && dr.project_id === row.project_id
		);
		if (!hasDispatch) {
			const originalIndex = rows.indexOf(row);
			standbyWithoutDispatch.push(originalIndex);
		}
	});
	if (standbyWithoutDispatch.length > 0) {
		warnings.push({
			type: 'STANDBY_WITHOUT_DISPATCH',
			description: `${standbyWithoutDispatch.length} beredskapspass saknar separat utryckningstid`,
			affected_rows: standbyWithoutDispatch,
			severity: 'info',
		});
	}
	
	// Check for excessive travel time (> work shift frame)
	const travelTimeExcessive: number[] = [];
	const dailyHours = new Map<string, number>(); // date -> total hours
	rows.forEach((row) => {
		if (row.unit === 'h') {
			const current = dailyHours.get(row.date) || 0;
			dailyHours.set(row.date, current + row.quantity);
		}
	});
	rows.forEach((row, index) => {
		if (row.wage_type_code === 'RESTID') {
			const dailyTotal = dailyHours.get(row.date) || 0;
			// Assume work shift is max 8 hours, travel time should not exceed this
			if (row.quantity > 8) {
				travelTimeExcessive.push(index);
			}
		}
	});
	if (travelTimeExcessive.length > 0) {
		warnings.push({
			type: 'TRAVEL_TIME_EXCESSIVE',
			description: `${travelTimeExcessive.length} restider överstiger arbetspassets ram (> 8h)`,
			affected_rows: travelTimeExcessive,
			severity: 'warning',
		});
	}
	
	// Check for piecework without active piecework project
	const pieceworkWithoutProject: number[] = [];
	rows.forEach((row, index) => {
		if (row.wage_type_code === 'ACKORD' && !row.project_id) {
			pieceworkWithoutProject.push(index);
		}
	});
	if (pieceworkWithoutProject.length > 0) {
		warnings.push({
			type: 'PIECEWORK_WITHOUT_PROJECT',
			description: `${pieceworkWithoutProject.length} ackordsregistreringar saknar aktivt ackordsprojekt`,
			affected_rows: pieceworkWithoutProject,
			severity: 'warning',
		});
	}
	
	// Check for OB without project (original check)
	const obWithoutProject: number[] = [];
	rows.forEach((row, index) => {
		if (row.wage_type_code.startsWith('OB_') && !row.project_id) {
			obWithoutProject.push(index);
		}
	});
	if (obWithoutProject.length > 0) {
		warnings.push({
			type: 'OB_WITHOUT_PROJECT',
			description: `${obWithoutProject.length} OB-registreringar saknar projekt`,
			affected_rows: obWithoutProject,
			severity: 'warning',
		});
	}
	
	// TODO: Check for excessive overtime (> 48h/week, > 50h/4weeks)
	// TODO: Check for missing weekly rest
	// TODO: Check for overlapping shifts
	
	return warnings;
}

