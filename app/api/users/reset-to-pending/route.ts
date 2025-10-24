import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const resetSchema = z.object({
	email: z.string().email(),
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

		// Get user's membership - only admins can do this
		const { data: membership, error: membershipError } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (membershipError || !membership || membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can reset users' }, { status: 403 });
		}

		// Parse request
		const body = await request.json();
		const { email } = resetSchema.parse(body);

		// Find the user by email
		const { data: targetProfile } = await supabase
			.from('profiles')
			.select('id, full_name')
			.eq('email', email)
			.single();

		if (!targetProfile) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get user from auth
		const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(
			targetProfile.id
		);

		if (authUserError || !authUser?.user) {
			return NextResponse.json({ error: 'User not found in auth system' }, { status: 404 });
		}

		// Update the user to remove confirmation
		const { error: updateError } = await adminClient.auth.admin.updateUserById(
			targetProfile.id,
			{
				email_confirm: false,
			}
		);

		if (updateError) {
			console.error('Error resetting user:', updateError);
			return NextResponse.json({ error: 'Failed to reset user status' }, { status: 500 });
		}

		return NextResponse.json({
			message: 'User reset to pending status successfully',
			email: email,
			name: targetProfile.full_name,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
		}

		console.error('Error resetting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

