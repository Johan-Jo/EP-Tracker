'use client';

import { useState } from 'react';
import { MaterialForm } from '@/components/materials/material-form';
import { MaterialsList } from '@/components/materials/materials-list';
import { Material, MaterialWithRelations } from '@/lib/schemas/material';

interface MaterialsTabContentProps {
	orgId: string;
}

export function MaterialsTabContent({ orgId }: MaterialsTabContentProps) {
	const [editingMaterial, setEditingMaterial] = useState<MaterialWithRelations | null>(null);

	return (
		<div className="space-y-6">
			<MaterialForm 
				orgId={orgId} 
				initialData={editingMaterial}
				onSuccess={() => setEditingMaterial(null)}
			/>
			<div>
				<h2 className="text-xl font-semibold mb-4">Material</h2>
				<MaterialsList 
					orgId={orgId} 
					onEdit={(material) => setEditingMaterial(material)}
				/>
			</div>
		</div>
	);
}

