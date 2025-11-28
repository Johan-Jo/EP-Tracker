import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { ChecklistPageNew } from '@/components/checklists/checklist-page-new';

export default async function ChecklistsPage() {
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode
	if (!inDemoMode && !user) {
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

