import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { CustomerCard } from '@/components/customers/customer-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage(props: PageProps) {
	const params = await props.params;
	const customerId = params.id;
	
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
							Du behöver vara medlem i en organisation för att se kunddetaljer.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();

	// Fetch customer
	const { data: customer, error: customerError } = await supabase
		.from('customers')
		.select('*')
		.eq('id', customerId)
		.eq('org_id', membership.org_id)
		.single();

	if (customerError || !customer) {
		console.error('Error fetching customer:', customerError);
		notFound();
	}

	const canManageCustomers = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
				<CustomerCard 
					customerId={customerId} 
					canMerge={canManageCustomers}
				/>
			</div>
		</div>
	);
}

