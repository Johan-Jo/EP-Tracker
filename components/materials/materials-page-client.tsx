'use client';

import { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Receipt, Car, Loader2 } from 'lucide-react';

// Lazy load heavy components - only load when tab is clicked
const MaterialsTabContent = lazy(() => import('@/components/materials/materials-tab-content').then(m => ({ default: m.MaterialsTabContent })));
const ExpensesTabContent = lazy(() => import('@/components/expenses/expenses-tab-content').then(m => ({ default: m.ExpensesTabContent })));
const MileageForm = lazy(() => import('@/components/mileage/mileage-form').then(m => ({ default: m.MileageForm })));
const MileageList = lazy(() => import('@/components/mileage/mileage-list').then(m => ({ default: m.MileageList })));

// Loading component
function TabLoading() {
	return (
		<div className='flex items-center justify-center min-h-[400px]'>
			<Loader2 className='w-8 h-8 animate-spin text-primary' />
		</div>
	);
}

interface MaterialsPageClientProps {
	orgId: string;
}

export function MaterialsPageClient({ orgId }: MaterialsPageClientProps) {
	return (
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

			{/* Materials Tab - Lazy loaded */}
			<TabsContent value="materials" className="space-y-6">
				<Suspense fallback={<TabLoading />}>
					<MaterialsTabContent orgId={orgId} />
				</Suspense>
			</TabsContent>

			{/* Expenses Tab - Lazy loaded */}
			<TabsContent value="expenses" className="space-y-6">
				<Suspense fallback={<TabLoading />}>
					<ExpensesTabContent orgId={orgId} />
				</Suspense>
			</TabsContent>

			{/* Mileage Tab - Lazy loaded */}
			<TabsContent value="mileage" className="space-y-6">
				<Suspense fallback={<TabLoading />}>
					<MileageForm orgId={orgId} />
					<div>
						<h2 className="text-xl font-semibold mb-4">Milersättning</h2>
						<MileageList orgId={orgId} />
					</div>
				</Suspense>
			</TabsContent>
		</Tabs>
	);
}

