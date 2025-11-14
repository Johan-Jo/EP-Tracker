import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import CustomersClient from './customers-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CustomersPage(props: PageProps) {
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

	// Build query
	let query = supabase
		.from('customers')
		.select('*')
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

	return (
		<CustomersClient 
			customers={customers || []} 
			canManageCustomers={canManageCustomers}
			search={search}
			type={type}
			includeArchived={includeArchived}
		/>
	);
}

