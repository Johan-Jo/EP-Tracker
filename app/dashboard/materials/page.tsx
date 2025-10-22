import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { MaterialsPageNew } from '@/components/materials/materials-page-new';

export default async function MaterialsPage() {
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

	return <MaterialsPageNew orgId={membership.org_id} />;
}
