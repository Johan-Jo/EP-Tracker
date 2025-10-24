import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active membership found' }, { status: 403 });
		}

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

