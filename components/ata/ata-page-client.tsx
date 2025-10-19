'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { AtaForm } from './ata-form';
import { AtaList } from './ata-list';

interface AtaPageClientProps {
	orgId: string;
}

export function AtaPageClient({ orgId }: AtaPageClientProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Ny ÄTA
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Skapa ÄTA</DialogTitle>
						</DialogHeader>
						<AtaForm
							onSuccess={() => setIsDialogOpen(false)}
							onCancel={() => setIsDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>

			<AtaList orgId={orgId} />
		</div>
	);
}

