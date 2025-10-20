'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AtaList } from './ata-list';
import Link from 'next/link';

interface AtaPageClientProps {
	orgId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
}

export function AtaPageClient({ orgId, userRole }: AtaPageClientProps) {
	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button asChild>
					<Link href="/dashboard/ata/new">
						<Plus className="h-4 w-4 mr-2" />
						Ny ÄTA
					</Link>
				</Button>
			</div>

			<AtaList orgId={orgId} userRole={userRole} />
		</div>
	);
}

