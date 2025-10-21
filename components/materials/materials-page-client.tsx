'use client';

import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Receipt, Car, Loader2 } from 'lucide-react';

// Use Next.js dynamic() for better code splitting
const MaterialsTabContent = dynamic(() => import('@/components/materials/materials-tab-content').then(m => ({ default: m.MaterialsTabContent })), {
	loading: () => <TabLoading />,
	ssr: false,
});

const ExpensesTabContent = dynamic(() => import('@/components/expenses/expenses-tab-content').then(m => ({ default: m.ExpensesTabContent })), {
	loading: () => <TabLoading />,
	ssr: false,
});

const MileageForm = dynamic(() => import('@/components/mileage/mileage-form').then(m => ({ default: m.MileageForm })), {
	loading: () => <TabLoading />,
	ssr: false,
});

const MileageList = dynamic(() => import('@/components/mileage/mileage-list').then(m => ({ default: m.MileageList })), {
	loading: () => <TabLoading />,
	ssr: false,
});

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
			<TabsList className="grid w-full grid-cols-3" data-tour="materials-tabs">
				<TabsTrigger value="materials" data-tour="add-material">
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

			{/* Materials Tab - Dynamically loaded */}
			<TabsContent value="materials" className="space-y-6">
				<MaterialsTabContent orgId={orgId} />
			</TabsContent>

			{/* Expenses Tab - Dynamically loaded */}
			<TabsContent value="expenses" className="space-y-6">
				<ExpensesTabContent orgId={orgId} />
			</TabsContent>

			{/* Mileage Tab - Dynamically loaded */}
			<TabsContent value="mileage" className="space-y-6">
				<MileageForm orgId={orgId} />
				<div>
					<h2 className="text-xl font-semibold mb-4">Milersättning</h2>
					<MileageList orgId={orgId} />
				</div>
			</TabsContent>
		</Tabs>
	);
}

