'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DiaryList } from './diary-list';
import Link from 'next/link';

interface DiaryPageClientProps {
	orgId: string;
}

export function DiaryPageClient({ orgId }: DiaryPageClientProps) {
	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Button asChild>
					<Link href="/dashboard/diary/new">
						<Plus className="h-4 w-4 mr-2" />
						Ny dagbokspost
					</Link>
				</Button>
			</div>

			<DiaryList orgId={orgId} />
		</div>
	);
}

