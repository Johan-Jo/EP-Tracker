import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const adminClient = createAdminClient();

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's membership
		const { data: membership, error: membershipError } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (membershipError || !membership) {
			return NextResponse.json({ error: 'No active membership found' }, { status: 403 });
		}

		// Only admins can check user statuses
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can view user statuses' }, { status: 403 });
		}

		// Get all members in this organization
		const { data: members, error: membersError } = await supabase
			.from('memberships')
			.select('user_id')
			.eq('org_id', membership.org_id)
			.eq('is_active', true);

		if (membersError || !members) {
			return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
		}

		// Check each user's confirmation status using admin client
		const statuses: Record<string, { confirmed: boolean; email_confirmed_at?: string }> = {};

		for (const member of members) {
			try {
				const { data: authUser } = await adminClient.auth.admin.getUserById(member.user_id);
				
				if (authUser?.user) {
					statuses[member.user_id] = {
						confirmed: !!(authUser.user.email_confirmed_at || authUser.user.confirmed_at),
						email_confirmed_at: authUser.user.email_confirmed_at || authUser.user.confirmed_at || undefined,
					};
				} else {
					statuses[member.user_id] = {
						confirmed: false,
					};
				}
			} catch (err) {
				console.error(`Error checking status for user ${member.user_id}:`, err);
				statuses[member.user_id] = {
					confirmed: false,
				};
			}
		}

		return NextResponse.json({ statuses });
	} catch (error) {
		console.error('Error checking user statuses:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

