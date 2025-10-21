import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { TimePageClient } from '@/components/time/time-page-client';
import { TimerWidget } from '@/components/time/timer-widget';

export default async function TimePage() {
	// Server-side: Only fetch session
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

	const canManageCrew = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Tidrapportering</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Logga arbetstid och bemanning
				</p>
			</div>

			{/* Timer Widget */}
			<TimerWidget userId={user.id} orgId={membership.org_id} inline={true} />

			{/* Client component with lazy-loaded tabs */}
			<TimePageClient orgId={membership.org_id} canManageCrew={canManageCrew} />
		</div>
	);
}

