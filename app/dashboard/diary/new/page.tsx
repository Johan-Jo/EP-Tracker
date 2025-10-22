import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { DiaryFormNew } from '@/components/diary/diary-form-new';

export default async function NewDiaryPage() {
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

	// Only admin and foreman can create diary entries
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard/diary');
	}

	return <DiaryFormNew orgId={membership.org_id} userId={user.id} />;
}

