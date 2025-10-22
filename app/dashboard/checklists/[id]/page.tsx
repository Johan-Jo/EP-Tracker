import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ChecklistDetailClient } from '@/components/checklists/checklist-detail-client';

export default async function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
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

	// Only admin and foreman can view checklists
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard/checklists');
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/checklists">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Checklista</h1>
				</div>
			</div>

			<ChecklistDetailClient checklistId={id} />
		</div>
	);
}

