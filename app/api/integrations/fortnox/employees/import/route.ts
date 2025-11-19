import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	getFortnoxConnectionForOrg,
	getFortnoxEmployees,
	FortnoxEmployeesNoAccessError,
	FortnoxError,
	logFortnoxConnectionMetadata,
} from '@/lib/integrations/fortnox/client';
import { mapFortnoxEmployeeToEPTracker } from '@/lib/integrations/fortnox/employee-mapper';
import { buildEmployeeInsert } from '@/lib/services/employee-mapper';

/**
 * POST /api/integrations/fortnox/employees/import
 * Import employees from Fortnox to EP-Tracker
 * Only admin and foreman can import employees
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			console.error('[Fortnox Import] Unauthorized - no user or membership:', { user: !!user, membership: !!membership });
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can import employees
		if (!['admin', 'foreman'].includes(membership.role)) {
			console.error('[Fortnox Import] Forbidden - insufficient role:', { 
				userId: user.id, 
				role: membership.role,
				orgId: membership.org_id 
			});
			return NextResponse.json({ 
				error: 'Forbidden',
				message: `Endast administratörer och förman kan importera anställda. Din roll är: ${membership.role}`
			}, { status: 403 });
		}

		console.log('[Fortnox Import] Authorized user:', { 
			userId: user.id, 
			role: membership.role,
			orgId: membership.org_id 
		});

		// Get Fortnox connection
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox connection not found. Please connect your Fortnox account first.' },
				{ status: 404 }
			);
		}

		// Log connection metadata for debugging (without exposing secrets)
		await logFortnoxConnectionMetadata(membership.org_id);

		// Parse request body
		const body = await request.json().catch(() => ({}));
		const { employeeIds, limit } = body;

		console.log('[Fortnox Import] Request body:', {
			employeeIdsCount: employeeIds?.length || 0,
			employeeIds: employeeIds,
			limit,
		});

		// Fetch employees from Fortnox
		let fortnoxEmployees;
		try {
			fortnoxEmployees = await getFortnoxEmployees(connection, limit || 500);
		} catch (error: any) {
			console.error('[Fortnox][employees] import route error', error);

			// Handle Fortnox permission/scope errors (403)
			if (error.name === 'FortnoxError' && error.status === 403) {
				return NextResponse.json(
					{
						code: 'FORTNOX_PERMISSION_OR_SCOPE_MISSING',
						message: 'Fortnox returnerar "Behörighet saknas" för anställda.',
						details: {
							fortnoxMessage: error.fortnoxMessage,
							fortnoxCode: error.fortnoxCode,
							fortnoxError: error.fortnoxError,
						},
					},
					{ status: 403 }
				);
			}

			// Handle legacy FortnoxEmployeesNoAccessError
			if (error instanceof FortnoxEmployeesNoAccessError) {
				return NextResponse.json(
					{
						error: 'NO_EMPLOYEE_ACCESS',
						message:
							'Fortnox-kontot saknar behörighet att läsa anställda. ' +
							'Kontrollera att Lön-modulen är aktiverad på ditt Fortnox-konto och ' +
							'att den användare som kopplade integrationen har behörighet att läsa anställda.',
					},
					{ status: 403 }
				);
			}

			// Handle other Fortnox errors as integration errors (502 Bad Gateway)
			if (error.name === 'FortnoxError') {
				return NextResponse.json(
					{
						code: 'FORTNOX_INTEGRATION_ERROR',
						message: 'Ett fel uppstod vid kommunikation med Fortnox API.',
						details: {
							httpStatus: error.status,
							fortnoxCode: error.fortnoxCode,
							fortnoxMessage: error.fortnoxMessage,
							fortnoxError: error.fortnoxError,
						},
					},
					{ status: 502 }
				);
			}

			// Generic error fallback
			return NextResponse.json(
				{
					code: 'FORTNOX_EMPLOYEES_IMPORT_ERROR',
					message: 'Kunde inte importera anställda från Fortnox.',
				},
				{ status: 502 }
			);
		}
		console.log('[Fortnox Import] Fetched from Fortnox:', fortnoxEmployees.length);

		// Filter by employeeIds if provided
		const employeesToImport = employeeIds
			? fortnoxEmployees.filter((e) => employeeIds.includes(e.EmployeeId))
			: fortnoxEmployees;

		console.log('[Fortnox Import] Employees to import:', employeesToImport.length);

		if (employeesToImport.length === 0) {
			return NextResponse.json(
				{ error: 'No employees found to import' },
				{ status: 400 }
			);
		}

		// Map and import employees
		const supabase = await createClient();
		const results = {
			created: 0,
			updated: 0,
			skipped: 0,
			skippedArchived: 0, // Track how many were skipped because they're archived
			conflicts: 0,
			errors: [] as Array<{ employeeId: string; error: string }>,
		};

		for (const fortnoxEmployee of employeesToImport) {
			try {
				const employeeId = fortnoxEmployee.EmployeeId || 'unknown';
				console.log(`[Fortnox Import] Processing employee: ${employeeId} - ${fortnoxEmployee.FirstName} ${fortnoxEmployee.LastName}`);
				
				// Validate required fields
				if (!fortnoxEmployee.FirstName || !fortnoxEmployee.LastName) {
					console.warn(`[Fortnox Import] Employee ${employeeId} missing name, skipping`);
					results.errors.push({
						employeeId,
						error: 'Anställd saknar förnamn eller efternamn i Fortnox',
					});
					results.conflicts++;
					continue;
				}

				// Log raw Fortnox data for debugging
				console.log(`[Fortnox Import] Raw Fortnox employee data:`, {
					EmployeeId: fortnoxEmployee.EmployeeId,
					FirstName: fortnoxEmployee.FirstName,
					LastName: fortnoxEmployee.LastName,
					PersonalIdentityNumber: fortnoxEmployee.PersonalIdentityNumber,
					Email: fortnoxEmployee.Email,
					Inactive: fortnoxEmployee.Inactive,
				});
				
				// Map Fortnox employee to EP-Tracker format
				const employeePayload = mapFortnoxEmployeeToEPTracker(fortnoxEmployee);
				console.log(`[Fortnox Import] Mapped employee:`, {
					employee_no: employeePayload.employee_no,
					first_name: employeePayload.first_name,
					last_name: employeePayload.last_name,
					personal_identity_no: employeePayload.personal_identity_no,
					email: employeePayload.email,
				});

				// IMPORTANT: Match existing employees in priority order:
				// 1. By personal_identity_no (most reliable identifier)
				// 2. By email (if personnummer saknas)
				// 3. By employee_no (may match Fortnox EmployeeId)
				// This ensures all employees get matched correctly

				let existingEmployee = null;
				let matchReason = '';

				// Priority 1: Match by personal_identity_no (most reliable)
				if (employeePayload.personal_identity_no) {
					const { data, error: checkError } = await supabase
						.from('employees')
						.select('id, employee_no, first_name, last_name, personal_identity_no, email, is_archived')
						.eq('org_id', membership.org_id)
						.eq('personal_identity_no', employeePayload.personal_identity_no)
						.maybeSingle();

					if (checkError && checkError.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing employee by personal_identity_no:`, checkError);
					} else if (data) {
						existingEmployee = data;
						matchReason = 'personal_identity_no';
					}
				}

				// Priority 2: If not matched by personal_identity_no, check by email
				if (!existingEmployee && employeePayload.email) {
					const { data, error: checkError } = await supabase
						.from('employees')
						.select('id, employee_no, first_name, last_name, personal_identity_no, email, is_archived')
						.eq('org_id', membership.org_id)
						.eq('email', employeePayload.email)
						.maybeSingle();

					if (checkError && checkError.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing employee by email:`, checkError);
					} else if (data) {
						existingEmployee = data;
						matchReason = 'email';
					}
				}

				// Priority 3: If still not matched, check by employee_no (may match Fortnox EmployeeId)
				if (!existingEmployee && employeePayload.employee_no) {
					const { data, error: checkError } = await supabase
						.from('employees')
						.select('id, employee_no, first_name, last_name, personal_identity_no, email, is_archived')
						.eq('org_id', membership.org_id)
						.eq('employee_no', employeePayload.employee_no)
						.maybeSingle();

					if (checkError && checkError.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing employee by employee_no:`, checkError);
					} else if (data) {
						existingEmployee = data;
						matchReason = 'employee_no';
					}
				}

				// If we found an existing employee, update it
				if (existingEmployee) {
					const employeeName = `${existingEmployee.first_name || ''} ${existingEmployee.last_name || ''}`.trim();
					console.log(`[Fortnox Import] Found existing employee (matched by ${matchReason}):`, {
						id: existingEmployee.id,
						employee_no: existingEmployee.employee_no,
						name: employeeName,
						is_archived: existingEmployee.is_archived,
					});

					// Update employee with Fortnox data (preserve existing data where Fortnox data is missing)
					const updateData: Record<string, unknown> = {
						updated_by: user.id,
						updated_at: new Date().toISOString(),
					};

					// Update fields if they're provided in Fortnox but missing in EP-Tracker
					if (employeePayload.personal_identity_no && !existingEmployee.personal_identity_no) {
						updateData.personal_identity_no = employeePayload.personal_identity_no;
					}
					if (employeePayload.email && !existingEmployee.email) {
						updateData.email = employeePayload.email;
					}
					// Update other fields if provided (phone, address, etc.)
					if (employeePayload.phone_mobile) updateData.phone_mobile = employeePayload.phone_mobile;
					if (employeePayload.phone_work) updateData.phone_work = employeePayload.phone_work;
					if (employeePayload.address_street) updateData.address_street = employeePayload.address_street;
					if (employeePayload.address_zip) updateData.address_zip = employeePayload.address_zip;
					if (employeePayload.address_city) updateData.address_city = employeePayload.address_city;
					if (employeePayload.address_country) updateData.address_country = employeePayload.address_country;
					if (employeePayload.hourly_rate_sek) updateData.hourly_rate_sek = employeePayload.hourly_rate_sek;
					if (employeePayload.employment_start_date) updateData.employment_start_date = employeePayload.employment_start_date.toISOString().split('T')[0];
					if (employeePayload.employment_end_date) updateData.employment_end_date = employeePayload.employment_end_date.toISOString().split('T')[0];
					if (employeePayload.employment_type) updateData.employment_type = employeePayload.employment_type;

					// Update is_archived based on Fortnox Inactive status
					updateData.is_archived = employeePayload.is_archived ?? false;

					const { error: updateError } = await supabase
						.from('employees')
						.update(updateData)
						.eq('id', existingEmployee.id);

					if (updateError) {
						console.error(`[Fortnox Import] Error updating employee ${existingEmployee.id}:`, updateError);
						results.errors.push({
							employeeId,
							error: `Kunde inte uppdatera anställd: ${updateError.message}`,
						});
						results.conflicts++;
					} else {
						console.log(`[Fortnox Import] Successfully updated employee ${existingEmployee.id}`);
						results.updated++;
						
						if (existingEmployee.is_archived) {
							results.skippedArchived++;
						}
					}
					continue;
				}

				// Build insert payload
				const insertPayload = buildEmployeeInsert({
					payload: employeePayload,
					orgId: membership.org_id,
					userId: user.id,
				});

				console.log(`[Fortnox Import] Insert payload:`, {
					employee_no: insertPayload.employee_no,
					first_name: insertPayload.first_name,
					last_name: insertPayload.last_name,
					personal_identity_no: insertPayload.personal_identity_no,
					email: insertPayload.email,
				});

				// Insert employee
				const { data: insertedEmployee, error: insertError } = await supabase
					.from('employees')
					.insert(insertPayload)
					.select('id, employee_no, first_name, last_name, personal_identity_no, email')
					.single();

				if (insertError) {
					// Handle duplicate key errors
					if (insertError.code === '23505') {
						console.log(`[Fortnox Import] Duplicate key error for ${employeeId}, skipping`);
						results.skipped++;
						results.conflicts++;
					} else {
						console.error(`[Fortnox Import] Insert error for ${employeeId}:`, insertError);
						throw insertError;
					}
				} else {
					console.log(`[Fortnox Import] Successfully imported: ${insertedEmployee?.employee_no} (ID: ${insertedEmployee?.id})`);
					console.log(`[Fortnox Import] Saved employee data:`, {
						employee_no: insertedEmployee?.employee_no,
						first_name: insertedEmployee?.first_name,
						last_name: insertedEmployee?.last_name,
						personal_identity_no: insertedEmployee?.personal_identity_no,
						email: insertedEmployee?.email,
					});
					results.created++;
				}
			} catch (error) {
				const employeeId = fortnoxEmployee.EmployeeId || 'unknown';
				console.error(`[Fortnox Import] Error importing employee ${employeeId}:`, error);
				results.errors.push({
					employeeId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				results.conflicts++;
			}
		}

		console.log('[Fortnox Import] Final results:', results);

		// Build detailed message
		const summary = {
			created: results.created,
			updated: results.updated,
			conflicts: results.conflicts,
		};

		let message = `Importerade ${results.created} ny${results.created !== 1 ? 'a' : ''} anställd${results.created !== 1 ? 'a' : ''}`;
		if (results.updated > 0) {
			message += `, uppdaterade ${results.updated} befintlig${results.updated !== 1 ? 'a' : ''} anställd${results.updated !== 1 ? 'a' : ''}`;
		}
		if (results.skipped > 0) {
			if (results.skippedArchived > 0) {
				message += `, hoppade över ${results.skipped} anställd${results.skipped !== 1 ? 'a' : ''} (${results.skippedArchived} är arkiverade och syns inte i standardlistan)`;
			} else {
				message += `, hoppade över ${results.skipped} anställd${results.skipped !== 1 ? 'a' : ''}`;
			}
		}
		if (results.errors.length > 0) {
			message += `, ${results.errors.length} fel`;
		}

		return NextResponse.json(
			{
				success: true,
				summary,
				message,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error importing Fortnox employees:', error);
		if (error instanceof Error) {
			return NextResponse.json(
				{ error: error.message || 'Failed to import employees from Fortnox' },
				{ status: 500 }
			);
		}
		return NextResponse.json(
			{ error: 'Failed to import employees from Fortnox' },
			{ status: 500 }
		);
	}
}

