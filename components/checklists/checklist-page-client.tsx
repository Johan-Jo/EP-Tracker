'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ChecklistList } from './checklist-list';
import Link from 'next/link';

interface ChecklistPageClientProps {
	orgId: string;
}

export function ChecklistPageClient({ orgId }: ChecklistPageClientProps) {
	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button asChild>
					<Link href="/dashboard/checklists/new">
						<Plus className="h-4 w-4 mr-2" />
						Ny checklista
					</Link>
				</Button>
			</div>

			<ChecklistList orgId={orgId} />
		</div>
	);
}

