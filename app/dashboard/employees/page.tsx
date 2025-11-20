import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getFortnoxConnectionForOrg } from '@/lib/integrations/fortnox/client';
import EmployeesClient from './employees-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<Card>
					<CardHeader>
						<CardTitle>Inga organisationer hittades</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Du behöver vara medlem i en organisation för att se personal.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();
	const search = typeof searchParams.search === 'string' ? searchParams.search : '';
	const includeArchived = typeof searchParams.includeArchived === 'string' 
		? searchParams.includeArchived === 'true' 
		: false;

	// ✅ PERFORMANCE: Select specific columns instead of *
	// Build query
	let query = supabase
		.from('employees')
		.select('id, org_id, employee_no, first_name, last_name, personal_identity_no, email, phone_mobile, phone_work, employment_type, hourly_rate_sek, employment_start_date, employment_end_date, is_archived, user_id, created_at, updated_at')
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false });

	// Apply filters
	if (!includeArchived) {
		query = query.eq('is_archived', false);
	}

	if (search) {
		query = query.or(
			`employee_no.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,personal_identity_no.ilike.%${search}%`
		);
	}

	const { data: employees, error } = await query;

	if (error) {
		console.error('Error fetching employees:', error);
	}

	const canManageEmployees = membership.role === 'admin' || membership.role === 'foreman';

	// Check Fortnox connection
	const fortnoxConnection = await getFortnoxConnectionForOrg(membership.org_id);
	const hasFortnoxConnection = !!fortnoxConnection;
	// TODO: Check if scope includes payroll/salary (if there's a way to check)
	const hasPayrollScope = undefined; // Could be checked from fortnoxConnection.scopes if available

	// Get Fortnox employee mappings to show which employees have Fortnox accounts
	// Map: employee.id -> fortnox_employee_id
	const fortnoxMappings = new Map<string, string>();
	if (hasFortnoxConnection && employees && employees.length > 0) {
		try {
			// Fetch all Fortnox employees to match against EP-Tracker employees
			const { getFortnoxEmployees } = await import('@/lib/integrations/fortnox/client');
			const fortnoxEmployees = await getFortnoxEmployees(fortnoxConnection, 500);

			// Create a map: email or personal_identity_no -> fortnox_employee_id
			const fortnoxByEmail = new Map<string, string>();
			const fortnoxByPersonalId = new Map<string, string>();
			const fortnoxEmployeeIds = new Set<string>();

			fortnoxEmployees.forEach(fe => {
				fortnoxEmployeeIds.add(fe.EmployeeId || '');
				if (fe.Email) {
					fortnoxByEmail.set(fe.Email.toLowerCase(), fe.EmployeeId || '');
				}
				if (fe.PersonalIdentityNumber) {
					// Normalize personal identity number (remove dashes)
					const normalized = fe.PersonalIdentityNumber.replace(/[-\s]/g, '');
					fortnoxByPersonalId.set(normalized, fe.EmployeeId || '');
				}
			});

			// Match EP-Tracker employees to Fortnox employees
			employees.forEach(employee => {
				let matchedFortnoxId: string | undefined;

				// Match by email first
				if (employee.email && fortnoxByEmail.has(employee.email.toLowerCase())) {
					matchedFortnoxId = fortnoxByEmail.get(employee.email.toLowerCase());
				}
				// Match by personal_identity_no
				else if (employee.personal_identity_no) {
					const normalized = employee.personal_identity_no.replace(/[-\s]/g, '');
					if (fortnoxByPersonalId.has(normalized)) {
						matchedFortnoxId = fortnoxByPersonalId.get(normalized);
					}
				}
				// Match by employee_no (if it matches a Fortnox EmployeeId)
				else if (employee.employee_no && fortnoxEmployeeIds.has(employee.employee_no)) {
					matchedFortnoxId = employee.employee_no;
				}

				if (matchedFortnoxId) {
					fortnoxMappings.set(employee.id, matchedFortnoxId);
					console.log('[Employees Page] Auto-matched employee via Fortnox data:', {
						employee_id: employee.id,
						employee_name: `${employee.first_name} ${employee.last_name}`,
						email: employee.email,
						fortnox_id: matchedFortnoxId,
					});
				}
			});

			// Also check fortnox_employee_mappings table for manually created mappings
			const { data: mappings } = await supabase
				.from('fortnox_employee_mappings')
				.select('person_id, fortnox_employee_id')
				.eq('org_id', membership.org_id);

			console.log('[Employees Page] Found mappings in database:', mappings?.length || 0, mappings);

			if (mappings && mappings.length > 0) {
				const personIds = mappings.map(m => m.person_id);
				const { data: profiles } = await supabase
					.from('profiles')
					.select('id, email, full_name')
					.in('id', personIds);

				console.log('[Employees Page] Found profiles for mappings:', profiles?.length || 0);

				if (profiles) {
					const profileToFortnoxId = new Map<string, string>();
					mappings.forEach(m => {
						profileToFortnoxId.set(m.person_id, m.fortnox_employee_id);
					});

					// Match employees to profiles via user_id (employee.user_id = profile.id = person_id)
					employees.forEach(employee => {
						if (!fortnoxMappings.has(employee.id) && employee.user_id) {
							// Direct match via user_id -> person_id
							const fortnoxId = profileToFortnoxId.get(employee.user_id);
							if (fortnoxId) {
								console.log('[Employees Page] Matched employee via user_id:', {
									employee_id: employee.id,
									employee_name: `${employee.first_name} ${employee.last_name}`,
									user_id: employee.user_id,
									fortnox_id: fortnoxId,
								});
								fortnoxMappings.set(employee.id, fortnoxId);
							} else {
								console.log('[Employees Page] No mapping found for employee:', {
									employee_id: employee.id,
									employee_name: `${employee.first_name} ${employee.last_name}`,
									user_id: employee.user_id,
									available_person_ids: Array.from(profileToFortnoxId.keys()),
								});
							}
						} else if (!employee.user_id) {
							console.log('[Employees Page] Employee has no user_id:', {
								employee_id: employee.id,
								employee_name: `${employee.first_name} ${employee.last_name}`,
								email: employee.email,
							});
						}
					});

					// Also match via email as fallback (if user_id match didn't work)
					employees.forEach(employee => {
						if (!fortnoxMappings.has(employee.id) && employee.email) {
							const matchingProfile = profiles.find(p => p.email === employee.email);
							if (matchingProfile) {
								const fortnoxId = profileToFortnoxId.get(matchingProfile.id);
								if (fortnoxId) {
									console.log('[Employees Page] Matched employee via email fallback:', {
										employee_id: employee.id,
										employee_name: `${employee.first_name} ${employee.last_name}`,
										email: employee.email,
										profile_id: matchingProfile.id,
										fortnox_id: fortnoxId,
									});
									fortnoxMappings.set(employee.id, fortnoxId);
								}
							}
						}
					});
				}
			}
		} catch (error) {
			console.error('[Employees Page] Error fetching Fortnox employees for mapping:', error);
			// Continue without Fortnox mappings if fetch fails
		}
	}

	return (
		<EmployeesClient 
			employees={employees || []} 
			canManageEmployees={canManageEmployees}
			search={search}
			includeArchived={includeArchived}
			hasFortnoxConnection={hasFortnoxConnection}
			hasPayrollScope={hasPayrollScope}
			orgId={membership.org_id}
			fortnoxMappings={fortnoxMappings}
		/>
	);
}

