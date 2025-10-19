import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateUserSchema = z.object({
	role: z.enum(['admin', 'foreman', 'worker', 'finance']).optional(),
	hourly_rate_sek: z.number().positive().nullable().optional(),
	full_name: z.string().min(1).optional(),
	phone: z.string().optional().nullable(),
});

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const supabase = await createClient();
		const userId = params.id;

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

		// Only admins can update users
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can update users' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = updateUserSchema.parse(body);

		// Get the target user's membership in this org
		const { data: targetMembership, error: targetError } = await supabase
			.from('memberships')
			.select('id')
			.eq('user_id', userId)
			.eq('org_id', membership.org_id)
			.eq('is_active', true)
			.single();

		if (targetError || !targetMembership) {
			return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
		}

		// Prevent admin from demoting themselves if they're the last admin
		if (user.id === userId && validatedData.role && validatedData.role !== 'admin') {
			const { data: admins, error: adminsError } = await supabase
				.from('memberships')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('role', 'admin')
				.eq('is_active', true);

			if (adminsError) {
				console.error('Error checking admins:', adminsError);
				return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
			}

			if (admins && admins.length <= 1) {
				return NextResponse.json(
					{ error: 'Cannot change role of the last admin' },
					{ status: 400 }
				);
			}
		}

		// Update membership (role and hourly_rate_sek)
		const membershipUpdates: any = {
			updated_at: new Date().toISOString(),
		};

		if (validatedData.role) {
			membershipUpdates.role = validatedData.role;
		}

		if (validatedData.hourly_rate_sek !== undefined) {
			membershipUpdates.hourly_rate_sek = validatedData.hourly_rate_sek;
		}

		const { error: membershipUpdateError } = await supabase
			.from('memberships')
			.update(membershipUpdates)
			.eq('id', targetMembership.id);

		if (membershipUpdateError) {
			console.error('Error updating membership:', membershipUpdateError);
			return NextResponse.json({ error: 'Failed to update user membership' }, { status: 500 });
		}

		// Update profile (full_name and phone)
		const profileUpdates: any = {};

		if (validatedData.full_name) {
			profileUpdates.full_name = validatedData.full_name;
		}

		if (validatedData.phone !== undefined) {
			profileUpdates.phone = validatedData.phone;
		}

		if (Object.keys(profileUpdates).length > 0) {
			const { error: profileUpdateError } = await supabase
				.from('profiles')
				.update(profileUpdates)
				.eq('id', userId);

			if (profileUpdateError) {
				console.error('Error updating profile:', profileUpdateError);
				return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
			}
		}

		return NextResponse.json({ message: 'User updated successfully' });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
		}

		console.error('Error updating user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const supabase = await createClient();
		const userId = params.id;

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

		// Only admins can deactivate users
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can deactivate users' }, { status: 403 });
		}

		// Prevent admin from deactivating themselves if they're the last admin
		if (user.id === userId) {
			const { data: admins, error: adminsError } = await supabase
				.from('memberships')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('role', 'admin')
				.eq('is_active', true);

			if (adminsError) {
				console.error('Error checking admins:', adminsError);
				return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
			}

			if (admins && admins.length <= 1) {
				return NextResponse.json(
					{ error: 'Cannot deactivate the last admin' },
					{ status: 400 }
				);
			}
		}

		// Get the target user's membership in this org
		const { data: targetMembership, error: targetError } = await supabase
			.from('memberships')
			.select('id')
			.eq('user_id', userId)
			.eq('org_id', membership.org_id)
			.eq('is_active', true)
			.single();

		if (targetError || !targetMembership) {
			return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
		}

		// Deactivate membership (soft delete)
		const { error: deactivateError } = await supabase
			.from('memberships')
			.update({
				is_active: false,
				updated_at: new Date().toISOString(),
			})
			.eq('id', targetMembership.id);

		if (deactivateError) {
			console.error('Error deactivating membership:', deactivateError);
			return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
		}

		return NextResponse.json({ message: 'User deactivated successfully' });
	} catch (error) {
		console.error('Error deactivating user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

