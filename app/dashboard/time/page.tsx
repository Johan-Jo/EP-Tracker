import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { TimePageNew } from '@/components/time/time-page-new';

interface PageProps {
	searchParams: Promise<{ project_id?: string }>;
}

export default async function TimePage(props: PageProps) {
	const searchParams = await props.searchParams;
	const projectId = searchParams.project_id;
	
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

	return <TimePageNew orgId={membership.org_id} userId={user.id} projectId={projectId} />;
}

