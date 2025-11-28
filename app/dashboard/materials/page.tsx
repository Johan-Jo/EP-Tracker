import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { MaterialsPageNew } from '@/components/materials/materials-page-new';

interface PageProps {
	searchParams: Promise<{
		project_id?: string;
		ata_draft?: string;
		return_to?: string;
		ata_title?: string;
	}>;
}

export default async function MaterialsPage(props: PageProps) {
	const searchParams = await props.searchParams;
	const projectId = searchParams.project_id;
	const ataDraftId = searchParams.ata_draft;
	const returnTo = searchParams.return_to;
	const ataTitle = searchParams.ata_title;

	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Server-side: Only fetch session
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

	return (
		<MaterialsPageNew
			orgId={membership.org_id}
			projectId={projectId}
			ataDraftId={ataDraftId}
			returnTo={returnTo}
			ataTitle={ataTitle}
		/>
	);
}
