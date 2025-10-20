import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { ChecklistPageClient } from '@/components/checklists/checklist-page-client';

export default async function ChecklistsPage() {
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

	// Only admin and foreman can access Checklists
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Checklistor</h1>
				<p className='text-muted-foreground mt-2'>
					Skapa och hantera checklistor för dina projekt
				</p>
			</div>

			<ChecklistPageClient orgId={membership.org_id} />
		</div>
	);
}

