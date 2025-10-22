import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { ChecklistPageNew } from '@/components/checklists/checklist-page-new';

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

	return <ChecklistPageNew orgId={membership.org_id} />;
}

