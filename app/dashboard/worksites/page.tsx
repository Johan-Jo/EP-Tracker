import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { WorksitesClient } from './worksites-client';

export default async function WorksitesPage() {
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// ✅ PERFORMANCE: Use cached session instead of separate queries
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode
	if (!inDemoMode && !user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='flex-1 overflow-auto pb-20 md:pb-0'>
				<div className='px-4 md:px-8 py-6'>
					<p className='text-muted-foreground'>Du är inte medlem i någon organisation.</p>
				</div>
			</div>
		);
	}

	const canEdit = ['admin', 'foreman'].includes(membership.role);
	const supabase = await createClient();

	// ✅ PERFORMANCE: Fetch only projects with active worksite for user's org
	// Uses existing index idx_projects_org_id
	const { data: worksites } = await supabase
		.from('projects')
		.select(`
			id,
			name,
			project_number,
			worksite_code,
			worksite_enabled,
			address_line1,
			address_line2,
			city,
			country,
			status,
			org_id
		`)
		.eq('org_id', membership.org_id)
		.eq('worksite_enabled', true)
		.order('name', { ascending: true });

	return <WorksitesClient worksites={worksites || []} canEdit={canEdit} userId={user.id} />;
}

