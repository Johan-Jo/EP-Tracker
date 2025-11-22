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

		// Get Fortnox connection (needed for fetching employees)
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.' },
				{ status: 404 }
			);
		}

		// Always fetch mappings from database to ensure we have the latest
		const supabaseClient = await createClient();
		
		// Fetch wage code mappings first
		console.log('[Fortnox Payroll Export] Fetching wage code mappings for org:', membership.org_id);
		const { data: dbWageCodeMappings, error: wageCodeError } = await supabaseClient
			.from('fortnox_wage_code_mappings')
			.select('ep_wage_type, fortnox_salary_code, is_active')
			.eq('org_id', membership.org_id)
			.eq('is_active', true);

		if (wageCodeError) {
			console.error('[Fortnox Payroll Export] Error fetching wage code mappings:', wageCodeError);
		} else {
			console.log('[Fortnox Payroll Export] Found wage code mappings:', dbWageCodeMappings?.length || 0);
		}

		if (dbWageCodeMappings && dbWageCodeMappings.length > 0) {
			finalWageCodeMappings = dbWageCodeMappings.map((m) => ({
				ep_wage_type: m.ep_wage_type,
				fortnox_salary_code: m.fortnox_salary_code,
			}));
			console.log('[Fortnox Payroll Export] Wage code mappings:', finalWageCodeMappings);
		}

		// Declare variables in broader scope for use after payroll_basis fetch
		const fortnoxByEmail = new Map<string, string>();
		const fortnoxByPersonalId = new Map<string, string>();
		const fortnoxEmployeeIds = new Set<string>();

		// Always fetch employee mappings from database (manual mappings)
		const { data: dbEmployeeMappings } = await supabaseClient
			.from('fortnox_employee_mappings')
			.select('person_id, fortnox_employee_id')
			.eq('org_id', membership.org_id);

		// Always fetch Fortnox employees - needed for validation and auto-matching
		const { getFortnoxEmployees } = await import('@/lib/integrations/fortnox/client');

		let fortnoxEmployees: any[] = [];
		try {
			fortnoxEmployees = await getFortnoxEmployees(connection, 1000);
		} catch (error) {
			console.error('[Fortnox Payroll Export] Error fetching Fortnox employees:', error);
			return NextResponse.json(
				{
					error: 'Kunde inte hämta anställda från Fortnox. Kontrollera att Fortnox-anslutningen fungerar.',
				},
				{ status: 502 }
			);
		}

		// Populate maps for matching (always needed for validation and auto-matching)
		fortnoxEmployees.forEach(fe => {
			const employeeId = fe.EmployeeId || '';
			fortnoxEmployeeIds.add(employeeId);
			if (fe.Email) {
				fortnoxByEmail.set(fe.Email.toLowerCase(), employeeId);
			}
			if (fe.PersonalIdentityNumber) {
				// Normalize personal identity number (remove dashes)
				const normalized = fe.PersonalIdentityNumber.replace(/[-\s]/g, '');
				fortnoxByPersonalId.set(normalized, employeeId);
			}
		});

		// NOTE: Auto-matching will happen AFTER we fetch payroll_basis entries
		// to only match profiles that are actually in the entries to be exported
		// This is moved below to after payroll_basisList is fetched

		// Validate mappings
		console.log('[Fortnox Payroll Export] Validating mappings:', {
			employeeMappingsCount: finalEmployeeMappings.length,
			wageCodeMappingsCount: finalWageCodeMappings.length,
			employeeMappings: finalEmployeeMappings.map(m => ({
				person_id: m.person_id,
				fortnox_employee_id: m.fortnox_employee_id,
			})),
		});

		// NOTE: Employee mapping validation moved to AFTER payroll_basis entries are fetched
		// so we can do auto-matching for profiles in the entries to export

		if (finalWageCodeMappings.length === 0) {
			const errorResponse = {
				error: 'Inga wage code-mappningar hittades.',
				message: 'Konfigurera mappning mellan EP-Tracker lönetyper (normal, övertid, OB) och Fortnox lönearter (SalaryCode) i Inställningar > Fortnox > Payroll Mappningar.',
				code: 'MISSING_WAGE_CODE_MAPPINGS',
				actionUrl: '/dashboard/settings/fortnox?tab=payroll',
			};
			console.log('[Fortnox Payroll Export] Returning 400 - no wage code mappings:', JSON.stringify(errorResponse, null, 2));
			const response = NextResponse.json(errorResponse, { status: 400 });
			console.log('[Fortnox Payroll Export] Response created:', {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
			});
			return response;
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
			const errorResponse = {
				error: 'Inga låsta löneunderlag hittades. Lås löneunderlaget först.',
			};
			console.log('[Fortnox Payroll Export] Returning 400 - no locked payroll basis:', errorResponse);
			return NextResponse.json(errorResponse, { status: 400 });
		}

		console.log('[Fortnox Payroll Export] Found locked payroll basis:', payrollBasisList.length);
		
		// Log period information for debugging
		const periods = payrollBasisList.map(pb => ({
			id: pb.id,
			person: pb.person?.full_name,
			period_start: pb.period_start,
			period_end: pb.period_end,
		}));
		console.log('[Fortnox Payroll Export] Payroll basis periods:', periods);

		// Now do auto-matching for only the profiles in the payroll_basis entries to be exported
		// Get unique person_ids from payroll_basis entries
		const personIdsInPayrollBasis = Array.from(new Set(payrollBasisList.map(pb => pb.person_id).filter(Boolean)));
		console.log('[Fortnox Payroll Export] Person IDs in payroll basis entries to export:', personIdsInPayrollBasis);

		// First, add direct mappings from database for person_ids in payroll_basis entries
		if (personIdsInPayrollBasis.length > 0 && dbEmployeeMappings && dbEmployeeMappings.length > 0) {
			personIdsInPayrollBasis.forEach(personId => {
				const directMapping = dbEmployeeMappings.find(m => m.person_id === personId);
				if (directMapping && fortnoxEmployeeIds.has(directMapping.fortnox_employee_id)) {
					// Only add if not already in finalEmployeeMappings
					if (!finalEmployeeMappings.find(m => m.person_id === personId)) {
						finalEmployeeMappings.push({
							person_id: personId,
							fortnox_employee_id: directMapping.fortnox_employee_id,
						});
						console.log('[Fortnox Payroll Export] Added direct mapping from database:', {
							person_id: personId,
							fortnox_employee_id: directMapping.fortnox_employee_id,
						});
					}
				}
			});
		}

		// Get person_ids that still need mapping
		const personIdsNeedingMapping = personIdsInPayrollBasis.filter(personId => 
			!finalEmployeeMappings.find(m => m.person_id === personId)
		);
		console.log('[Fortnox Payroll Export] Person IDs still needing mapping:', personIdsNeedingMapping);

		// Then do auto-matching for profiles that don't have mappings yet
		if (personIdsNeedingMapping.length > 0) {
			// Get profiles for these specific person_ids that need mapping
			const { data: profiles } = await supabaseClient
				.from('profiles')
				.select('id, email, full_name')
				.in('id', personIdsNeedingMapping);

			// Also get employees to use their data for matching (employees have personal_identity_no and employee_no)
			const { data: epEmployees } = await supabaseClient
				.from('employees')
				.select('id, user_id, employee_no, personal_identity_no, email')
				.eq('org_id', membership.org_id)
				.eq('is_archived', false)
				.in('user_id', personIdsNeedingMapping);

			// Create a map from profile_id to employee data for easier lookup
			const employeesByProfileId = new Map<string, typeof epEmployees[0]>();
			epEmployees?.forEach(emp => {
				if (emp.user_id) {
					employeesByProfileId.set(emp.user_id, emp);
				}
			});

			// Auto-match only the profiles in payroll_basis entries to Fortnox employees
			// We need to match profiles because payroll_basis.person_id refers to profiles.id
			if (profiles && profiles.length > 0) {
				profiles.forEach((profile) => {
					const profileId = profile.id;

					// Get employee data if available (for personal_identity_no and employee_no)
					const employeeData = employeesByProfileId.get(profileId);

					let matchedFortnoxId: string | undefined;

					// Check direct mapping in fortnox_employee_mappings first
					const directMapping = dbEmployeeMappings?.find(m => m.person_id === profileId);
					if (directMapping && fortnoxEmployeeIds.has(directMapping.fortnox_employee_id)) {
						matchedFortnoxId = directMapping.fortnox_employee_id;
					}
					// Match by personal_identity_no (from employee) - most reliable
					else if (employeeData?.personal_identity_no) {
						const normalized = employeeData.personal_identity_no.replace(/[-\s]/g, '');
						if (fortnoxByPersonalId.has(normalized)) {
							matchedFortnoxId = fortnoxByPersonalId.get(normalized);
						}
					}
					// Match by employee_no (if it matches a Fortnox EmployeeId)
					else if (employeeData?.employee_no && fortnoxEmployeeIds.has(employeeData.employee_no)) {
						matchedFortnoxId = employeeData.employee_no;
					}
					// Match by email (from profile) - less reliable, use as last resort
					else if (profile.email && fortnoxByEmail.has(profile.email.toLowerCase())) {
						matchedFortnoxId = fortnoxByEmail.get(profile.email.toLowerCase());
					}
					// Match by email (from employee) - even less reliable
					else if (employeeData?.email && fortnoxByEmail.has(employeeData.email.toLowerCase())) {
						matchedFortnoxId = fortnoxByEmail.get(employeeData.email.toLowerCase());
					}

					if (matchedFortnoxId) {
						console.log('[Fortnox Payroll Export] Auto-matched employee:', {
							profile_id: profileId,
							profile_name: profile.full_name,
							profile_email: profile.email,
							employee_no: employeeData?.employee_no,
							employee_email: employeeData?.email,
							personal_identity_no: employeeData?.personal_identity_no ? '***' : undefined,
							matched_fortnox_employee_id: matchedFortnoxId,
							match_method: directMapping ? 'direct_mapping' : 
										   (employeeData?.personal_identity_no && fortnoxByPersonalId.has(employeeData.personal_identity_no.replace(/[-\s]/g, ''))) ? 'personal_id' :
										   (employeeData?.employee_no && fortnoxEmployeeIds.has(employeeData.employee_no)) ? 'employee_no' :
										   (profile.email && fortnoxByEmail.has(profile.email.toLowerCase())) ? 'profile_email' :
										   (employeeData?.email && fortnoxByEmail.has(employeeData.email.toLowerCase())) ? 'employee_email' : 'unknown'
						});
						finalEmployeeMappings.push({
							person_id: profileId,
							fortnox_employee_id: matchedFortnoxId,
						});
					}
				});
			}
		}

		// Validate that all person_ids in payroll_basis entries have mappings
		const personIdsWithMappings = finalEmployeeMappings.map(m => m.person_id);
		const personIdsMissingMappings = personIdsInPayrollBasis.filter(personId => !personIdsWithMappings.includes(personId));

		if (personIdsMissingMappings.length > 0) {
			console.log('[Fortnox Payroll Export] Missing mappings for person_ids:', personIdsMissingMappings);
			const errorResponse = {
				error: 'Inga employee-mappningar hittades för alla anställda i löneunderlaget.',
				message: `Saknar mappningar för ${personIdsMissingMappings.length} anställd(a). Importera anställda från Fortnox först eller konfigurera mappningar manuellt i inställningar.`,
				personIdsMissingMappings,
			};
			console.log('[Fortnox Payroll Export] Returning 400 - missing employee mappings:', errorResponse);
			return NextResponse.json(errorResponse, { status: 400 });
		}

		console.log('[Fortnox Payroll Export] All person_ids have mappings:', {
			total: personIdsInPayrollBasis.length,
			mappings: finalEmployeeMappings.length,
		});

		// Save auto-matched mappings to database for future use
		if (finalEmployeeMappings.length > 0) {
			const mappingsToSave = finalEmployeeMappings.map(m => ({
				org_id: membership.org_id,
				person_id: m.person_id,
				fortnox_employee_id: m.fortnox_employee_id,
			}));

			// Upsert mappings (don't overwrite existing ones, but add new ones)
			const { error: saveMappingsError } = await supabase
				.from('fortnox_employee_mappings')
				.upsert(mappingsToSave, {
					onConflict: 'org_id,person_id',
					ignoreDuplicates: false,
				});

			if (saveMappingsError) {
				console.error('[Fortnox Payroll Export] Error saving auto-matched mappings:', saveMappingsError);
				// Don't fail the export if saving mappings fails
			} else {
				console.log('[Fortnox Payroll Export] Saved auto-matched mappings to database:', mappingsToSave.length);
			}
		}

		const fetchedIds = payrollBasisList.map((pb) => pb.id);
		const { data: existingLinks } = await supabase
			.from('fortnox_payroll_links')
			.select('payroll_basis_id, status')
			.in('payroll_basis_id', fetchedIds)
			.eq('org_id', membership.org_id)
			.eq('status', 'exported');

		if (existingLinks && existingLinks.length > 0) {
			const alreadyExportedIds = existingLinks.map((link) => link.payroll_basis_id);
			const errorResponse = {
				error: 'Några löneunderlag är redan exporterade till Fortnox',
				alreadyExportedIds,
			};
			console.log('[Fortnox Payroll Export] Returning 400 - already exported:', errorResponse);
			return NextResponse.json(errorResponse, { status: 400 });
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
			const errorResponse = {
				error: 'Valideringsfel',
				message: `Valideringsfel vid export: ${validationErrors.map((e: any) => e.message || e).join(', ')}`,
				details: validationErrors,
			};
			console.log('[Fortnox Payroll Export] Returning 400 - validation errors:', JSON.stringify(errorResponse, null, 2));
			return NextResponse.json(errorResponse, { status: 400 });
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
			// Extract common error patterns for better user messages
			const firstError = exportErrors[0]?.error || 'Okänt fel';
			let userMessage = 'Alla transaktioner misslyckades';
			
			// Check if it's a token refresh error
			if (firstError.includes('Invalid refresh token') || firstError.includes('invalid_grant')) {
				userMessage = 'Fortnox-anslutningen är ogiltig. Logga ut och logga in igen i Fortnox-inställningar.';
			} else if (firstError.includes('refresh')) {
				userMessage = 'Kunde inte uppdatera Fortnox-anslutningen. Kontrollera att Fortnox-anslutningen fungerar.';
			} else if (firstError.includes('Unauthorized') || firstError.includes('401') || firstError.includes('403')) {
				userMessage = 'Inte tillstånd att exportera till Fortnox. Kontrollera att Fortnox-anslutningen har rätt behörigheter.';
			}
			
			// Get unique error messages (don't duplicate the same error)
			const uniqueErrors = Array.from(new Set(exportErrors.map(e => e.error))).slice(0, 3);
			
			return NextResponse.json(
				{
					status: 'error',
					error: 'Export misslyckades',
					message: userMessage,
					errors: exportErrors,
					errorDetails: uniqueErrors.length > 0 ? uniqueErrors.join('; ') : firstError,
				},
				{ status: 500 }
			);
		}

		// Build user-friendly error messages
		const errorMessages: string[] = [];
		const uniqueErrors = new Set<string>();
		
		exportErrors.forEach(err => {
			const errorMsg = err.error || 'Okänt fel';
			// Extract Fortnox-specific error messages for better UX
			if (errorMsg.includes('Tillåt kalenderregistrering')) {
				const salaryCodeMatch = errorMsg.match(/Löneart (\d+)/);
				const salaryCode = salaryCodeMatch ? salaryCodeMatch[1] : '';
				const friendlyMsg = `Löneart ${salaryCode} behöver ha "Tillåt kalenderregistrering" aktiverat i Fortnox. Gå till Register > Lönearter och koder > Registrering i Fortnox.`;
				if (!uniqueErrors.has(friendlyMsg)) {
					uniqueErrors.add(friendlyMsg);
					errorMessages.push(friendlyMsg);
				}
			} else if (!uniqueErrors.has(errorMsg)) {
				uniqueErrors.add(errorMsg);
				errorMessages.push(errorMsg);
			}
		});

		return NextResponse.json({
			status: exportErrors.length > 0 ? 'partial' : 'ok',
			successCount: allTransactionIds.length,
			failureCount: exportErrors.length,
			transactionIds: allTransactionIds,
			details: {
				attendanceTransactions: attendanceTransactions.length,
				salaryTransactions: salaryTransactions.length,
				errors: exportErrors,
				errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
			},
			message: exportErrors.length > 0 
				? `Exporterade ${allTransactionIds.length} transaktioner till Fortnox, ${exportErrors.length} misslyckades.${errorMessages.length > 0 ? ` ${errorMessages.join(' ')}` : ''}`
				: `Exporterade ${allTransactionIds.length} transaktioner till Fortnox`,
		});
	} catch (error) {
		console.error('[Fortnox Payroll Export API] Error:', error);

		let errorMessage = 'Ett oväntat fel uppstod';
		if (error instanceof Error) {
			errorMessage = error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		}

		// Check if it's a token refresh error
		if (errorMessage.includes('Invalid refresh token') || errorMessage.includes('invalid_grant')) {
			errorMessage = 'Fortnox-anslutningen är ogiltig. Logga ut och logga in igen i Fortnox-inställningar.';
		}

		return NextResponse.json(
			{ 
				status: 'error',
				error: 'Export misslyckades',
				message: errorMessage,
			},
			{ status: 500 }
		);
	}
}

