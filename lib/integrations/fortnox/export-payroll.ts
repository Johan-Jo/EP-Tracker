import { createClient } from '@/lib/supabase/server';
import type {
	FortnoxSalaryTransactionPayload,
	FortnoxAttendanceTransactionPayload,
	FortnoxAttendanceCauseCode,
	FortnoxPayrollValidationError,
} from './types';

/**
 * Type definition for payroll_basis row from database
 */
export interface PayrollBasisRow {
	id: string;
	org_id: string;
	person_id: string;
	period_start: string;
	period_end: string;
	hours_norm: number;
	hours_overtime: number;
	ob_hours: number;
	ob_hours_actual: number | null;
	ob_hours_multiplier: number | null;
	break_hours: number;
	total_hours: number;
	gross_salary_sek: number | null;
	locked: boolean;
	locked_by: string | null;
	locked_at: string | null;
	person?: {
		id: string;
		full_name: string;
		email: string;
	};
}

/**
 * Employee mapping configuration
 * Maps EP-Tracker person_id to Fortnox EmployeeId
 * TODO: Replace with database table (e.g., fortnox_employee_mappings)
 */
export interface EmployeeMapping {
	person_id: string;
	fortnox_employee_id: string;
}

/**
 * Wage code mapping configuration
 * Maps EP-Tracker wage types to Fortnox SalaryCode
 * TODO: Replace with database table (e.g., fortnox_wage_code_mappings)
 */
export interface WageCodeMapping {
	ep_wage_type: string; // e.g., 'normal', 'overtime', 'ob'
	fortnox_salary_code: string;
}

/**
 * Options for building Fortnox payroll payloads
 */
export interface BuildFortnoxPayrollPayloadOptions {
	employeeMappings: EmployeeMapping[];
	wageCodeMappings: WageCodeMapping[];
	costCenter?: string;
	project?: string;
}

/**
 * Format date to YYYY-MM-DD format for Fortnox
 */
function formatDateForFortnox(dateString: string): string {
	return new Date(dateString).toISOString().split('T')[0]!;
}

/**
 * Format number to string with 2 decimals for Fortnox amounts
 */
function formatAmountForFortnox(amount: number | null | undefined): string {
	if (amount === null || amount === undefined) {
		return '0.00';
	}
	return amount.toFixed(2);
}

/**
 * Format hours to string with 1 decimal for Fortnox
 */
function formatHoursForFortnox(hours: number | null | undefined): string {
	if (hours === null || hours === undefined || hours === 0) {
		return '0.0';
	}
	return hours.toFixed(1);
}

/**
 * Get Fortnox EmployeeId for a person
 */
function getFortnoxEmployeeId(
	personId: string,
	mappings: EmployeeMapping[]
): string | null {
	const mapping = mappings.find((m) => m.person_id === personId);
	return mapping?.fortnox_employee_id || null;
}

/**
 * Get Fortnox SalaryCode for a wage type
 */
function getFortnoxSalaryCode(
	wageType: string,
	mappings: WageCodeMapping[]
): string | null {
	const mapping = mappings.find((m) => m.ep_wage_type === wageType);
	return mapping?.fortnox_salary_code || null;
}

/**
 * Validate payroll basis before export
 */
export function validatePayrollBasisForExport(
	payrollBasis: PayrollBasisRow[],
	options: BuildFortnoxPayrollPayloadOptions
): FortnoxPayrollValidationError[] {
	const errors: FortnoxPayrollValidationError[] = [];

	for (const basis of payrollBasis) {
		// Check if locked
		if (!basis.locked) {
			errors.push({
				field: `payroll_basis.${basis.id}.locked`,
				message: 'Löneunderlag måste vara låst innan export',
				value: basis.locked,
			});
		}

		// Check employee mapping
		const employeeId = getFortnoxEmployeeId(basis.person_id, options.employeeMappings);
		if (!employeeId) {
			errors.push({
				field: `payroll_basis.${basis.id}.person_id`,
				message: `Anställd ${basis.person?.full_name || basis.person_id} saknar Fortnox EmployeeId-mappning`,
				value: basis.person_id,
			});
		}

		// Check wage code mappings
		if (basis.hours_norm > 0) {
			const normalCode = getFortnoxSalaryCode('normal', options.wageCodeMappings);
			if (!normalCode) {
				errors.push({
					field: `payroll_basis.${basis.id}.hours_norm`,
					message: 'Saknar mappning för normala timmar till Fortnox lönearter',
					value: basis.hours_norm,
				});
			}
		}

		if (basis.hours_overtime > 0) {
			const overtimeCode = getFortnoxSalaryCode('overtime', options.wageCodeMappings);
			if (!overtimeCode) {
				errors.push({
					field: `payroll_basis.${basis.id}.hours_overtime`,
					message: 'Saknar mappning för övertid till Fortnox lönearter',
					value: basis.hours_overtime,
				});
			}
		}

		if (basis.ob_hours > 0 || (basis.ob_hours_actual && basis.ob_hours_actual > 0)) {
			const obCode = getFortnoxSalaryCode('ob', options.wageCodeMappings);
			if (!obCode) {
				errors.push({
					field: `payroll_basis.${basis.id}.ob_hours`,
					message: 'Saknar mappning för OB-timmar till Fortnox lönearter',
					value: basis.ob_hours,
				});
			}
		}

		// Check that we have some data to export
		if (
			basis.total_hours === 0 &&
			(basis.gross_salary_sek === null || basis.gross_salary_sek === 0)
		) {
			errors.push({
				field: `payroll_basis.${basis.id}.total_hours`,
				message: 'Löneunderlag har inga timmar eller belopp att exportera',
				value: basis.total_hours,
			});
		}
	}

	return errors;
}

/**
 * Build Fortnox attendance transactions from payroll basis
 * Creates one transaction per day for normal hours, overtime, and OB hours
 */
export function buildFortnoxAttendanceTransactions(
	payrollBasis: PayrollBasisRow,
	options: BuildFortnoxPayrollPayloadOptions
): FortnoxAttendanceTransactionPayload[] {
	const transactions: FortnoxAttendanceTransactionPayload[] = [];

	const employeeId = getFortnoxEmployeeId(payrollBasis.person_id, options.employeeMappings);
	if (!employeeId) {
		// Should be caught by validation, but return empty array if missing
		return [];
	}

	const periodStart = new Date(payrollBasis.period_start);
	const periodEnd = new Date(payrollBasis.period_end);
	const daysInPeriod = Math.ceil(
		(periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
	) + 1;

	// Calculate average hours per day for each type
	const normalHoursPerDay = payrollBasis.hours_norm / daysInPeriod;
	const overtimeHoursPerDay = payrollBasis.hours_overtime / daysInPeriod;
	const obHoursPerDay = (payrollBasis.ob_hours_actual || payrollBasis.ob_hours) / daysInPeriod;

	// Create transactions for each day in the period
	for (let i = 0; i < daysInPeriod; i++) {
		const currentDate = new Date(periodStart);
		currentDate.setDate(currentDate.getDate() + i);
		const dateStr = formatDateForFortnox(currentDate.toISOString());

		// Normal hours (ARB = work)
		if (normalHoursPerDay > 0) {
			transactions.push({
				EmployeeId: employeeId,
				Date: dateStr,
				CauseCode: 'ARB',
				Hours: formatHoursForFortnox(normalHoursPerDay),
				CostCenter: options.costCenter,
				Project: options.project,
			});
		}

		// Overtime hours (OB1 = overtime 1)
		if (overtimeHoursPerDay > 0) {
			transactions.push({
				EmployeeId: employeeId,
				Date: dateStr,
				CauseCode: 'OB1',
				Hours: formatHoursForFortnox(overtimeHoursPerDay),
				CostCenter: options.costCenter,
				Project: options.project,
			});
		}

		// OB hours (OB2 = overtime 2, or use a specific OB code if available)
		if (obHoursPerDay > 0) {
			transactions.push({
				EmployeeId: employeeId,
				Date: dateStr,
				CauseCode: 'OB2', // TODO: Make configurable or use specific OB code from mapping
				Hours: formatHoursForFortnox(obHoursPerDay),
				CostCenter: options.costCenter,
				Project: options.project,
			});
		}
	}

	return transactions;
}

/**
 * Build Fortnox salary transactions from payroll basis
 * Creates one transaction per wage type (normal, overtime, OB)
 */
export function buildFortnoxSalaryTransactions(
	payrollBasis: PayrollBasisRow,
	options: BuildFortnoxPayrollPayloadOptions
): FortnoxSalaryTransactionPayload[] {
	const transactions: FortnoxSalaryTransactionPayload[] = [];

	const employeeId = getFortnoxEmployeeId(payrollBasis.person_id, options.employeeMappings);
	if (!employeeId) {
		// Should be caught by validation, but return empty array if missing
		return [];
	}
	
	console.log('[Fortnox Payroll Export] Using EmployeeId for salary transaction:', {
		person_id: payrollBasis.person_id,
		person_name: payrollBasis.person?.full_name,
		fortnox_employee_id: employeeId,
	});

	// Use period_end as the transaction date (or period_start, depending on business logic)
	const transactionDate = formatDateForFortnox(payrollBasis.period_end);

	// Normal hours salary transaction
	if (payrollBasis.hours_norm > 0) {
		const normalCode = getFortnoxSalaryCode('normal', options.wageCodeMappings);
		if (normalCode) {
			// Calculate amount if we have gross_salary_sek and need to split it
			// For now, we'll use gross_salary_sek if available, otherwise leave Amount empty
			// (Fortnox may calculate it based on hours and rate)
			const amount = payrollBasis.gross_salary_sek
				? formatAmountForFortnox(payrollBasis.gross_salary_sek)
				: undefined;

			transactions.push({
				EmployeeId: employeeId,
				Date: transactionDate,
				SalaryCode: normalCode,
				Amount: amount,
				CostCenter: options.costCenter,
				Project: options.project,
				TextRow: `Normal timmar ${payrollBasis.period_start} - ${payrollBasis.period_end}`,
			});
		}
	}

	// Overtime hours salary transaction
	if (payrollBasis.hours_overtime > 0) {
		const overtimeCode = getFortnoxSalaryCode('overtime', options.wageCodeMappings);
		if (overtimeCode) {
			transactions.push({
				EmployeeId: employeeId,
				Date: transactionDate,
				SalaryCode: overtimeCode,
				CostCenter: options.costCenter,
				Project: options.project,
				TextRow: `Övertid ${payrollBasis.period_start} - ${payrollBasis.period_end}`,
			});
		}
	}

	// OB hours salary transaction
	if (payrollBasis.ob_hours > 0 || (payrollBasis.ob_hours_actual && payrollBasis.ob_hours_actual > 0)) {
		const obCode = getFortnoxSalaryCode('ob', options.wageCodeMappings);
		if (obCode) {
			transactions.push({
				EmployeeId: employeeId,
				Date: transactionDate,
				SalaryCode: obCode,
				CostCenter: options.costCenter,
				Project: options.project,
				TextRow: `OB-timmar ${payrollBasis.period_start} - ${payrollBasis.period_end}`,
			});
		}
	}

	return transactions;
}

/**
 * Build all Fortnox payroll transactions (attendance + salary) from payroll basis
 * @param payrollBasisId Payroll basis ID (single entry)
 * @param orgId Organization ID
 * @param options Mapping options
 * @returns Object with attendance and salary transaction arrays
 */
export async function buildFortnoxPayrollTransactionsFromPayrollBasis(
	payrollBasisId: string,
	orgId: string,
	options: BuildFortnoxPayrollPayloadOptions
): Promise<{
	attendanceTransactions: FortnoxAttendanceTransactionPayload[];
	salaryTransactions: FortnoxSalaryTransactionPayload[];
	errors: FortnoxPayrollValidationError[];
}> {
	const supabase = await createClient();

	// Fetch payroll basis with person data
	const { data: payrollBasis, error } = await supabase
		.from('payroll_basis')
		.select(`
			*,
			person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
		`)
		.eq('id', payrollBasisId)
		.eq('org_id', orgId)
		.single();

	if (error || !payrollBasis) {
		throw new Error(`Failed to fetch payroll basis: ${error?.message || 'Not found'}`);
	}

	const basisRow = payrollBasis as unknown as PayrollBasisRow;

	// Validate
	const validationErrors = validatePayrollBasisForExport([basisRow], options);
	if (validationErrors.length > 0) {
		return {
			attendanceTransactions: [],
			salaryTransactions: [],
			errors: validationErrors,
		};
	}

	// Build transactions
	const attendanceTransactions = buildFortnoxAttendanceTransactions(basisRow, options);
	const salaryTransactions = buildFortnoxSalaryTransactions(basisRow, options);

	return {
		attendanceTransactions,
		salaryTransactions,
		errors: [],
	};
}

/**
 * Build Fortnox payroll transactions for multiple payroll basis entries
 * @param payrollBasisIds Array of payroll basis IDs
 * @param orgId Organization ID
 * @param options Mapping options
 * @returns Object with attendance and salary transaction arrays, plus errors
 */
export async function buildFortnoxPayrollTransactionsBatch(
	payrollBasisIds: string[],
	orgId: string,
	options: BuildFortnoxPayrollPayloadOptions
): Promise<{
	attendanceTransactions: FortnoxAttendanceTransactionPayload[];
	salaryTransactions: FortnoxSalaryTransactionPayload[];
	errors: FortnoxPayrollValidationError[];
}> {
	const supabase = await createClient();

	// Fetch all payroll basis entries with person data
	const { data: payrollBasisList, error } = await supabase
		.from('payroll_basis')
		.select(`
			*,
			person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
		`)
		.in('id', payrollBasisIds)
		.eq('org_id', orgId);

	if (error) {
		throw new Error(`Failed to fetch payroll basis: ${error.message}`);
	}

	if (!payrollBasisList || payrollBasisList.length === 0) {
		throw new Error('No payroll basis entries found');
	}

	const basisRows = payrollBasisList as unknown as PayrollBasisRow[];

	// Validate all entries
	const validationErrors = validatePayrollBasisForExport(basisRows, options);
	if (validationErrors.length > 0) {
		// Return errors but still try to build transactions for valid entries
		// (or return early if strict validation is required)
	}

	// Build transactions for all entries
	const allAttendanceTransactions: FortnoxAttendanceTransactionPayload[] = [];
	const allSalaryTransactions: FortnoxSalaryTransactionPayload[] = [];

	for (const basis of basisRows) {
		const attendance = buildFortnoxAttendanceTransactions(basis, options);
		const salary = buildFortnoxSalaryTransactions(basis, options);
		allAttendanceTransactions.push(...attendance);
		allSalaryTransactions.push(...salary);
	}

	return {
		attendanceTransactions: allAttendanceTransactions,
		salaryTransactions: allSalaryTransactions,
		errors: validationErrors,
	};
}

