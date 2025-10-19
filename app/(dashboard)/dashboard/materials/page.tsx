import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialForm } from '@/components/materials/material-form';
import { MaterialsList } from '@/components/materials/materials-list';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { ExpensesList } from '@/components/expenses/expenses-list';
import { MileageForm } from '@/components/mileage/mileage-form';
import { MileageList } from '@/components/mileage/mileage-list';
import { Package, Receipt, Car } from 'lucide-react';

export default async function MaterialsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Ingen aktiv organisation hittades</p>
			</div>
		);
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Material & Kostnader</h1>
				<p className='text-muted-foreground mt-2'>
					Registrera material, utlägg och milersättning
				</p>
			</div>

			<Tabs defaultValue="materials" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="materials">
						<Package className="w-4 h-4 mr-2" />
						Material
					</TabsTrigger>
					<TabsTrigger value="expenses">
						<Receipt className="w-4 h-4 mr-2" />
						Utlägg
					</TabsTrigger>
					<TabsTrigger value="mileage">
						<Car className="w-4 h-4 mr-2" />
						Milersättning
					</TabsTrigger>
				</TabsList>

				{/* Materials Tab */}
				<TabsContent value="materials" className="space-y-6">
					<MaterialForm orgId={membership.org_id} />
					<div>
						<h2 className="text-xl font-semibold mb-4">Material</h2>
						<MaterialsList orgId={membership.org_id} />
					</div>
				</TabsContent>

				{/* Expenses Tab */}
				<TabsContent value="expenses" className="space-y-6">
					<ExpenseForm orgId={membership.org_id} />
					<div>
						<h2 className="text-xl font-semibold mb-4">Utlägg</h2>
						<ExpensesList orgId={membership.org_id} />
					</div>
				</TabsContent>

				{/* Mileage Tab */}
				<TabsContent value="mileage" className="space-y-6">
					<MileageForm orgId={membership.org_id} />
					<div>
						<h2 className="text-xl font-semibold mb-4">Milersättning</h2>
						<MileageList orgId={membership.org_id} />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
