import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { AtaPageNew } from '@/components/ata/ata-page-new';

interface PageProps {
	searchParams: Promise<{ project_id?: string }>;
}

export default async function AtaPage(props: PageProps) {
	const searchParams = await props.searchParams;
	const projectId = searchParams.project_id;
	
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

	// Workers can create ÄTA proposals, but only admin and foreman can approve
	// Finance role cannot access ÄTA
	if (membership.role === 'finance') {
		redirect('/dashboard');
	}

return (
	<AtaPageNew
		orgId={membership.org_id}
		userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue'}
		projectId={projectId}
	/>
);
}

