import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import CustomersClient from './customers-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFortnoxConnectionForOrg } from '@/lib/integrations/fortnox/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CustomersPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Use cached session
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode
	if (!inDemoMode && !user) {
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
							Du behöver vara medlem i en organisation för att se kunder.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();
	const search = typeof searchParams.search === 'string' ? searchParams.search : '';
	const type = typeof searchParams.type === 'string' ? searchParams.type : undefined;
	const includeArchived = typeof searchParams.includeArchived === 'string' 
		? searchParams.includeArchived === 'true' 
		: false;

	// ✅ PERFORMANCE: Select specific columns instead of *
	// Build query
	let query = supabase
		.from('customers')
		.select('id, org_id, customer_no, type, company_name, org_no, first_name, last_name, personal_identity_no, is_archived, created_at, updated_at')
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false });

	// Apply filters
	if (!includeArchived) {
		query = query.eq('is_archived', false);
	}

	if (type && (type === 'COMPANY' || type === 'PRIVATE')) {
		query = query.eq('type', type);
	}

	if (search) {
		query = query.or(
			`customer_no.ilike.%${search}%,company_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,org_no.ilike.%${search}%,personal_identity_no.ilike.%${search}%`
		);
	}

	const { data: customers, error } = await query;

	if (error) {
		console.error('Error fetching customers:', error);
	}

	const canManageCustomers = membership.role === 'admin' || membership.role === 'foreman';

	// Check Fortnox connection
	const fortnoxConnection = await getFortnoxConnectionForOrg(membership.org_id);
	const hasFortnoxConnection = !!fortnoxConnection;
	// Check if scope includes customer
	const hasCustomerScope = fortnoxConnection?.scopes?.includes('customer') ?? false;

	return (
		<CustomersClient 
			customers={customers || []} 
			canManageCustomers={canManageCustomers}
			search={search}
			type={type}
			includeArchived={includeArchived}
			hasFortnoxConnection={hasFortnoxConnection}
			hasCustomerScope={hasCustomerScope}
		/>
	);
}

