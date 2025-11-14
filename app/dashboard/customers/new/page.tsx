'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerForm } from '@/components/customers/customer-form';
import { useCreateCustomer } from '@/lib/hooks/use-customers';
import { type CustomerPayload } from '@/lib/schemas/customer';

export default function NewCustomerPage() {
	const router = useRouter();
	const createCustomer = useCreateCustomer();

	const handleSubmit = async (payload: CustomerPayload) => {
		const customer = await createCustomer.mutateAsync(payload);
		// Redirect to customer detail page
		router.push(`/dashboard/customers/${customer.id}`);
	};

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
				<div className="mb-6">
					<h1 className="mb-1 text-3xl font-bold text-foreground">Ny kund</h1>
					<p className="text-sm text-muted-foreground">
						Skapa en ny kund i systemet
					</p>
				</div>
				<Card>
					<CardHeader>
						<CardTitle>Kundinformation</CardTitle>
					</CardHeader>
					<CardContent>
						<CustomerForm 
							onSubmit={handleSubmit}
							onCancel={() => router.push('/dashboard/customers')}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

