import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import ApprovalsPageNew from '@/components/approvals/approvals-page-new';

export default async function ApprovalsPage() {
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

	// Only admin and foreman can access Approvals - redirect others
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

return (
	<ApprovalsPageNew
		orgId={membership.org_id}
		userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue'}
	/>
);
}

