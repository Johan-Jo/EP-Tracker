import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { DiaryPageNew } from '@/components/diary/diary-page-new';

interface PageProps {
	searchParams: Promise<{ project_id?: string }>;
}

export default async function DiaryPage(props: PageProps) {
	const searchParams = await props.searchParams;
	const projectId = searchParams.project_id;
	
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

	// Allow all authenticated roles to access Diary

	return <DiaryPageNew orgId={membership.org_id} projectId={projectId} />;
}

