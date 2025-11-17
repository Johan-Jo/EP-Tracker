import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FortnoxSettingsPage } from '@/components/settings/fortnox-settings-page';

export default async function FortnoxSettingsPageRoute() {
	const supabase = await createClient();
	
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's membership
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Only admin and finance can access Fortnox settings
	if (!membership || !['admin', 'finance'].includes(membership.role)) {
		redirect('/dashboard/settings');
	}

	// Get organization ID
	const orgId = membership.org_id;

	if (!orgId) {
		redirect('/dashboard/settings');
	}

	return <FortnoxSettingsPage orgId={orgId} />;
}


