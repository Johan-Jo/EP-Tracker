import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { ApprovalsPageClient } from '@/components/approvals/approvals-page-client';
import { ApprovalsPageWithTour } from '@/components/approvals/approvals-page-with-tour';

export default async function ApprovalsPage() {
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

	// Only admin and foreman can access Approvals - redirect others
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	return (
		<ApprovalsPageWithTour>
			<div className='container mx-auto p-6 lg:p-8 space-y-6'>
				<div data-tour="approvals-week">
					<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Godkännanden</h1>
					<p className='text-gray-600 dark:text-gray-400 mt-2'>
						Granska och godkänn tidrapporter och kostnader
					</p>
				</div>

				<ApprovalsPageClient 
					orgId={membership.org_id} 
					userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} 
				/>
			</div>
		</ApprovalsPageWithTour>
	);
}

