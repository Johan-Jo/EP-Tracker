import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizationPageNew } from '@/components/settings/organization-page-new';

export default async function OrganizationSettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization (first one for now)
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role, organizations(*)')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Only admin can manage organization - redirect others
	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard');
	}

	const organization = membership.organizations as any;

	return (
		<OrganizationPageNew
			organization={{
				id: organization.id,
				name: organization.name,
				created_at: organization.created_at,
			}}
		/>
	);
}

