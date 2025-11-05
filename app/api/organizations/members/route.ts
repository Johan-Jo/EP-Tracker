import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET() {
	try {
		// Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Get all members in organization with their profiles
		const { data: members, error } = await supabase
			.from('memberships')
			.select(`
				id,
				user_id,
				role,
				hourly_rate_sek,
				profiles:user_id (
					id,
					full_name,
					email,
					phone
				)
			`)
			.eq('org_id', membership.org_id)
			.eq('is_active', true)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching organization members:', error);
			return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
		}

		return NextResponse.json({ members });
	} catch (error) {
		console.error('Error in GET /api/organizations/members:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

