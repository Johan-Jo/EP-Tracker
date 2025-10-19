import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialsTabContent } from '@/components/materials/materials-tab-content';
import { ExpensesTabContent } from '@/components/expenses/expenses-tab-content';
import { MileageForm } from '@/components/mileage/mileage-form';
import { MileageList } from '@/components/mileage/mileage-list';
import { Package, Receipt, Car } from 'lucide-react';
import { getSession } from '@/lib/auth/get-session';

export default async function MaterialsPage() {
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

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
					<MaterialsTabContent orgId={membership.org_id} />
				</TabsContent>

				{/* Expenses Tab */}
				<TabsContent value="expenses" className="space-y-6">
					<ExpensesTabContent orgId={membership.org_id} />
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
