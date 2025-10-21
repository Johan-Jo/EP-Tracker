import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { DiaryPageClient } from '@/components/diary/diary-page-client';

export default async function DiaryPage() {
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

	// Only admin and foreman can access Diary - redirect others
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Dagbok</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					AFC-stil dagboksposter för dina projekt
				</p>
			</div>

			<DiaryPageClient orgId={membership.org_id} />
		</div>
	);
}

