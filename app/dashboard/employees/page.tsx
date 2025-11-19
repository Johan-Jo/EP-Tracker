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

	// Build query
	let query = supabase
		.from('employees')
		.select('*')
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

	return (
		<EmployeesClient 
			employees={employees || []} 
			canManageEmployees={canManageEmployees}
			search={search}
			includeArchived={includeArchived}
			hasFortnoxConnection={hasFortnoxConnection}
			hasPayrollScope={hasPayrollScope}
			orgId={membership.org_id}
		/>
	);
}

