import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorksitesClient } from './worksites-client';

export default async function WorksitesPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organizations
	const { data: memberships } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true);

	if (!memberships || memberships.length === 0) {
		return (
			<div className='flex-1 overflow-auto pb-20 md:pb-0'>
				<div className='px-4 md:px-8 py-6'>
					<p className='text-muted-foreground'>Du är inte medlem i någon organisation.</p>
				</div>
			</div>
		);
	}

	const orgIds = memberships.map(m => m.org_id);
	const canEdit = memberships.some(m => ['admin', 'foreman'].includes(m.role));

	// Fetch all projects with active worksite
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
		.in('org_id', orgIds)
		.eq('worksite_enabled', true)
		.order('name', { ascending: true });

	return <WorksitesClient worksites={worksites || []} canEdit={canEdit} userId={user.id} />;
}

