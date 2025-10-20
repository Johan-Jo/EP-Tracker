import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InviteUserDialog } from '@/components/users/invite-user-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { UsersPageClient } from '@/components/users/users-page-client';

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
			profiles (*)
		`
		)
		.eq('org_id', membership.org_id)
		.eq('is_active', true)
		.order('created_at', { ascending: false });

	const canInvite = membership.role === 'admin';

	// Transform members data for client component
	const transformedMembers = members?.map((member: any) => ({
		id: member.id,
		role: member.role,
		hourly_rate_sek: member.hourly_rate_sek,
		profiles: {
			id: member.profiles.id,
			full_name: member.profiles.full_name,
			email: member.profiles.email,
			phone: member.profiles.phone,
		},
	})) || [];

	return <UsersPageClient members={transformedMembers} canInvite={canInvite} />;
}

