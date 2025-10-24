import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const resendInviteSchema = z.object({
	user_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
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

		// Only admins can resend invitations
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can resend invitations' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = resendInviteSchema.parse(body);

		// Get the target user's profile
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('email, full_name')
			.eq('id', validatedData.user_id)
			.single();

		if (profileError || !profile) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Verify user is in this organization
		const { data: targetMembership, error: targetError } = await supabase
			.from('memberships')
			.select('id')
			.eq('user_id', validatedData.user_id)
			.eq('org_id', membership.org_id)
			.eq('is_active', true)
			.single();

		if (targetError || !targetMembership) {
			return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
		}

		// Check if user has already confirmed their email
		const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(
			validatedData.user_id
		);

		if (authUserError) {
			console.error('Error checking user status:', authUserError);
			return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
		}

		// If user is already confirmed, they don't need a new invitation
		if (authUser?.user?.email_confirmed_at || authUser?.user?.confirmed_at) {
			return NextResponse.json(
				{ error: 'User has already completed setup. No invitation needed.' },
				{ status: 400 }
			);
		}

		// Resend invitation email using admin client with redirect to invite callback page
		const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(profile.email, {
			redirectTo: `${request.nextUrl.origin}/invite-callback`,
			data: {
				full_name: profile.full_name,
				email: profile.email,
			},
		});

		if (inviteError) {
			console.error('Error resending invitation:', inviteError);
			return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
		}

		return NextResponse.json({
			message: 'Invitation resent successfully',
			email: profile.email,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
		}

		console.error('Error resending invitation:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

