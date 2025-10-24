import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const deleteUserSchema = z.object({
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

		// Only admins can delete users
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = deleteUserSchema.parse(body);

		// Get the target user from auth.users by email using admin client
		const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers();

		if (authUsersError) {
			console.error('Error listing users:', authUsersError);
			return NextResponse.json({ error: 'Failed to find user' }, { status: 500 });
		}

		const targetAuthUser = authUsers.users.find((u) => u.email === validatedData.email);

		if (!targetAuthUser) {
			return NextResponse.json({ error: 'User not found in auth system' }, { status: 404 });
		}

		const targetUserId = targetAuthUser.id;

		console.log('Deleting user completely:', {
			email: validatedData.email,
			userId: targetUserId,
		});

		// 1. Delete from memberships (using admin client to bypass RLS)
		const { error: membershipDeleteError } = await adminClient
			.from('memberships')
			.delete()
			.eq('user_id', targetUserId);

		if (membershipDeleteError) {
			console.error('Error deleting memberships:', membershipDeleteError);
			// Continue anyway
		}

		// 2. Delete from profiles (using admin client to bypass RLS)
		const { error: profileDeleteError } = await adminClient
			.from('profiles')
			.delete()
			.eq('id', targetUserId);

		if (profileDeleteError) {
			console.error('Error deleting profile:', profileDeleteError);
			// Continue anyway
		}

		// 3. Delete from auth.users (admin only)
		const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

		if (authDeleteError) {
			console.error('Error deleting auth user:', authDeleteError);
			return NextResponse.json({ error: 'Failed to delete user from auth system' }, { status: 500 });
		}

		return NextResponse.json({
			message: `User ${validatedData.email} deleted completely from all tables`,
			userId: targetUserId,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
		}

		console.error('Error deleting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

