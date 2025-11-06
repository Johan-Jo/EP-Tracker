import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UsersPageNew } from '@/components/users/users-page-new';

export default async function UsersSettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization membership
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Only admin can manage users - redirect others
	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard');
	}

	// Get all members in organization with their profiles
	const { data: members } = await supabase
		.from('memberships')
		.select(
			`
			*,
			profiles (
				*
			)
		`
		)
		.eq('org_id', membership.org_id)
		.eq('is_active', true)
		.order('created_at', { ascending: false });

	const canInvite = membership.role === 'admin';

	// Get auth users to check confirmed status
	const memberUserIds = members?.map((m: any) => m.user_id) || [];
	
	// Transform members data for client component
	const transformedMembers =
		members?.map((member: any) => ({
			id: member.id,
			user_id: member.user_id,
			role: member.role,
			hourly_rate_sek: member.hourly_rate_sek,
			salary_per_hour_sek: member.salary_per_hour_sek,
			created_at: member.created_at,
			profiles: {
				id: member.profiles.id,
				full_name: member.profiles.full_name,
				email: member.profiles.email,
				phone: member.profiles.phone,
			},
		})) || [];

	return <UsersPageNew members={transformedMembers} canInvite={canInvite} currentUserId={user.id} />;
}

