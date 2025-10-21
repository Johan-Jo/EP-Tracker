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
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Checklistor</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Skapa och hantera checklistor för dina projekt
				</p>
			</div>

			<ChecklistPageClient orgId={membership.org_id} />
		</div>
	);
}

