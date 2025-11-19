import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { getFortnoxConnectionForOrg } from '@/lib/integrations/fortnox/client';
import {
	createFortnoxSalaryTransactionsBatch,
	createFortnoxAttendanceTransactionsBatch,
} from '@/lib/integrations/fortnox/client-batch';
import {
	buildFortnoxPayrollTransactionsFromPayrollBasis,
	buildFortnoxPayrollTransactionsBatch,
	type BuildFortnoxPayrollPayloadOptions,
	type EmployeeMapping,
	type WageCodeMapping,
} from '@/lib/integrations/fortnox/export-payroll';

/**
 * POST /api/integrations/fortnox/export-payroll
 * Export locked payroll_basis to Fortnox Payroll
 * 
 * Body:
 * - payrollBasisId: Single payroll basis ID (string)
 * - payrollBasisIds: Array of payroll basis IDs (string[])
 * - employeeMappings: Array of { person_id, fortnox_employee_id }
 * - wageCodeMappings: Array of { ep_wage_type, fortnox_salary_code }
 * - costCenter: Optional cost center code
 * - project: Optional project identifier
 */
export async function POST(request: NextRequest) {
	console.log('[Fortnox Payroll Export API] ==========================================');
	console.log('[Fortnox Payroll Export API] POST /api/integrations/fortnox/export-payroll called');
	
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can export payroll
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json().catch(() => ({}));
		const {
			payrollBasisId,
			payrollBasisIds,
			employeeMappings = [],
			wageCodeMappings = [],
			costCenter,
			project,
		} = body as {
			payrollBasisId?: string;
			payrollBasisIds?: string[];
			employeeMappings?: EmployeeMapping[];
			wageCodeMappings?: WageCodeMapping[];
			costCenter?: string;
			project?: string;
		};

		// Determine which payroll basis IDs to export
		const idsToExport = payrollBasisIds || (payrollBasisId ? [payrollBasisId] : []);

		if (idsToExport.length === 0) {
			return NextResponse.json(
				{ error: 'payrollBasisId eller payrollBasisIds krävs' },
				{ status: 400 }
			);
		}

		// Fetch mappings from database if not provided
		let finalEmployeeMappings = employeeMappings;
		let finalWageCodeMappings = wageCodeMappings;

		if (finalEmployeeMappings.length === 0 || finalWageCodeMappings.length === 0) {
			// Fetch employee mappings
			const supabaseClient = await createClient();
			const { data: dbEmployeeMappings } = await supabaseClient
				.from('fortnox_employee_mappings')
				.select('person_id, fortnox_employee_id')
				.eq('org_id', membership.org_id);

			if (dbEmployeeMappings && dbEmployeeMappings.length > 0) {
				finalEmployeeMappings = dbEmployeeMappings.map((m) => ({
					person_id: m.person_id,
					fortnox_employee_id: m.fortnox_employee_id,
				}));
			}

			// Fetch wage code mappings
			const { data: dbWageCodeMappings } = await supabaseClient
				.from('fortnox_wage_code_mappings')
				.select('ep_wage_type, fortnox_salary_code')
				.eq('org_id', membership.org_id)
				.eq('is_active', true);

			if (dbWageCodeMappings && dbWageCodeMappings.length > 0) {
				finalWageCodeMappings = dbWageCodeMappings.map((m) => ({
					ep_wage_type: m.ep_wage_type,
					fortnox_salary_code: m.fortnox_salary_code,
				}));
			}
		}

		// Validate mappings
		if (finalEmployeeMappings.length === 0) {
			return NextResponse.json(
				{
					error: 'Inga employee-mappningar hittades. Konfigurera mappning mellan EP-Tracker anställda och Fortnox EmployeeId i inställningar.',
				},
				{ status: 400 }
			);
		}

		if (finalWageCodeMappings.length === 0) {
			return NextResponse.json(
				{
					error: 'Inga wage code-mappningar hittades. Konfigurera mappning mellan EP-Tracker lönetyper och Fortnox lönearter i inställningar.',
				},
				{ status: 400 }
			);
		}

		// Get Fortnox connection
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.' },
				{ status: 404 }
			);
		}

		// TODO: Verify OAuth scope includes payroll/salary (if there's a way to check)

		// Fetch payroll_basis entries and verify they're locked
		const supabase = await createClient();
		const { data: payrollBasisList, error: fetchError } = await supabase
			.from('payroll_basis')
			.select(`
				*,
				person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
			`)
			.in('id', idsToExport)
			.eq('org_id', membership.org_id)
			.eq('locked', true);

		if (fetchError) {
			console.error('[Fortnox Payroll Export] Error fetching payroll basis:', fetchError);
			return NextResponse.json(
				{ error: 'Kunde inte hämta löneunderlag' },
				{ status: 500 }
			);
		}

		if (!payrollBasisList || payrollBasisList.length === 0) {
			return NextResponse.json(
				{ error: 'Inga låsta löneunderlag hittades. Lås löneunderlaget först.' },
				{ status: 400 }
			);
		}

		// Check if any are already exported
		const fetchedIds = payrollBasisList.map((pb) => pb.id);
		const { data: existingLinks } = await supabase
			.from('fortnox_payroll_links')
			.select('payroll_basis_id, status')
			.in('payroll_basis_id', fetchedIds)
			.eq('org_id', membership.org_id)
			.eq('status', 'exported');

		if (existingLinks && existingLinks.length > 0) {
			const alreadyExportedIds = existingLinks.map((link) => link.payroll_basis_id);
			return NextResponse.json(
				{
					error: 'Några löneunderlag är redan exporterade till Fortnox',
					alreadyExportedIds,
				},
				{ status: 400 }
			);
		}

		// Build options for export
		const options: BuildFortnoxPayrollPayloadOptions = {
			employeeMappings: finalEmployeeMappings,
			wageCodeMappings: finalWageCodeMappings,
			costCenter,
			project,
		};

		// Build transactions
		let attendanceTransactions;
		let salaryTransactions;
		let validationErrors;

		if (idsToExport.length === 1) {
			const result = await buildFortnoxPayrollTransactionsFromPayrollBasis(
				idsToExport[0]!,
				membership.org_id,
				options
			);
			attendanceTransactions = result.attendanceTransactions;
			salaryTransactions = result.salaryTransactions;
			validationErrors = result.errors;
		} else {
			const result = await buildFortnoxPayrollTransactionsBatch(
				idsToExport,
				membership.org_id,
				options
			);
			attendanceTransactions = result.attendanceTransactions;
			salaryTransactions = result.salaryTransactions;
			validationErrors = result.errors;
		}

		// Check validation errors
		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					error: 'Valideringsfel',
					details: validationErrors,
				},
				{ status: 400 }
			);
		}

		// Check if we have any transactions to export
		if (attendanceTransactions.length === 0 && salaryTransactions.length === 0) {
			return NextResponse.json(
				{ error: 'Inga transaktioner att exportera' },
				{ status: 400 }
			);
		}

		// Export to Fortnox
		const allTransactionIds: Array<number | string> = [];
		const exportErrors: Array<{ type: string; error: string }> = [];

		// Export attendance transactions
		if (attendanceTransactions.length > 0) {
			console.log(`[Fortnox Payroll Export] Exporting ${attendanceTransactions.length} attendance transactions`);
			const attendanceResult = await createFortnoxAttendanceTransactionsBatch(
				connection,
				attendanceTransactions
			);

			// Collect transaction IDs
			attendanceResult.results.forEach((result) => {
				if (result.success && result.transactionId) {
					allTransactionIds.push(result.transactionId);
				} else if (!result.success) {
					exportErrors.push({
						type: 'attendance',
						error: result.error || 'Okänt fel',
					});
				}
			});

			console.log(
				`[Fortnox Payroll Export] Attendance: ${attendanceResult.successCount} success, ${attendanceResult.failureCount} failed`
			);
		}

		// Export salary transactions
		if (salaryTransactions.length > 0) {
			console.log(`[Fortnox Payroll Export] Exporting ${salaryTransactions.length} salary transactions`);
			const salaryResult = await createFortnoxSalaryTransactionsBatch(
				connection,
				salaryTransactions
			);

			// Collect transaction IDs
			salaryResult.results.forEach((result) => {
				if (result.success && result.transactionId) {
					allTransactionIds.push(result.transactionId);
				} else if (!result.success) {
					exportErrors.push({
						type: 'salary',
						error: result.error || 'Okänt fel',
					});
				}
			});

			console.log(
				`[Fortnox Payroll Export] Salary: ${salaryResult.successCount} success, ${salaryResult.failureCount} failed`
			);
		}

		// Determine overall status
		const hasFailures = exportErrors.length > 0;
		const status = hasFailures && allTransactionIds.length === 0 ? 'failed' : 'exported';

		// Save export status to database (one record per payroll_basis)
		const linkDataArray = fetchedIds.map((basisId) => ({
			org_id: membership.org_id,
			payroll_basis_id: basisId,
			fortnox_transaction_ids: allTransactionIds,
			status,
			error_message: hasFailures ? exportErrors.map((e) => `${e.type}: ${e.error}`).join('; ') : null,
			payload_json: {
				attendanceCount: attendanceTransactions.length,
				salaryCount: salaryTransactions.length,
				// Don't store full payloads with PII
			},
			response_json: {
				transactionIds: allTransactionIds,
				errors: exportErrors,
			},
			exported_by: user.id,
		}));

		// Upsert links (one per payroll_basis)
		const { error: linkError } = await supabase
			.from('fortnox_payroll_links')
			.upsert(linkDataArray, {
				onConflict: 'org_id,payroll_basis_id',
			});

		if (linkError) {
			console.error('[Fortnox Payroll Export] Failed to save export status:', linkError);
			// Don't fail the request if saving status fails - the export may have succeeded
		}

		// Return response
		if (hasFailures && allTransactionIds.length === 0) {
			return NextResponse.json(
				{
					status: 'error',
					message: 'Alla transaktioner misslyckades',
					errors: exportErrors,
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({
			status: 'ok',
			successCount: allTransactionIds.length,
			failureCount: exportErrors.length,
			transactionIds: allTransactionIds,
			details: {
				attendanceTransactions: attendanceTransactions.length,
				salaryTransactions: salaryTransactions.length,
				errors: exportErrors,
			},
			message: `Exporterade ${allTransactionIds.length} transaktioner till Fortnox${exportErrors.length > 0 ? ` (${exportErrors.length} misslyckades)` : ''}`,
		});
	} catch (error) {
		console.error('[Fortnox Payroll Export API] Error:', error);

		let errorMessage = 'Ett oväntat fel uppstod';
		if (error instanceof Error) {
			errorMessage = error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		}

		return NextResponse.json(
			{ status: 'error', message: errorMessage },
			{ status: 500 }
		);
	}
}

