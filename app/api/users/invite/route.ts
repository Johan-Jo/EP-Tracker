import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inviteUserSchema = z.object({
	email: z.string().email({ message: 'Ogiltig e-postadress' }),
	role: z.enum(['admin', 'foreman', 'worker', 'finance'], { message: 'Ogiltig roll' }),
	hourly_rate_sek: z.number().positive().optional().nullable(), // Timtaxa debitering
	salary_per_hour_sek: z.number().positive().optional().nullable(), // Timlön
	full_name: z.string().min(1, { message: 'Namn krävs' }),
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

		// Only admins can invite users
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = inviteUserSchema.parse(body);

		// Check if user with this email already exists in the organization
		const { data: existingProfile } = await supabase
			.from('profiles')
			.select('id')
			.eq('email', validatedData.email)
			.single();

		if (existingProfile) {
			// Check if they're already a member of this org
			const { data: existingMembership } = await supabase
				.from('memberships')
				.select('id, is_active')
				.eq('user_id', existingProfile.id)
				.eq('org_id', membership.org_id)
				.single();

			if (existingMembership) {
				if (existingMembership.is_active) {
					return NextResponse.json(
						{ error: 'User is already a member of this organization' },
						{ status: 400 }
					);
				} else {
					// Reactivate the membership using admin client
					const { error: reactivateError } = await adminClient
						.from('memberships')
						.update({
							is_active: true,
							role: validatedData.role,
							hourly_rate_sek: validatedData.hourly_rate_sek,
							salary_per_hour_sek: validatedData.salary_per_hour_sek,
							updated_at: new Date().toISOString(),
						})
						.eq('id', existingMembership.id);

					if (reactivateError) {
						console.error('Error reactivating membership:', reactivateError);
						return NextResponse.json(
							{ error: 'Failed to reactivate user' },
							{ status: 500 }
					);
				}

			// Send invitation email with redirect to invite callback page
			const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(
				validatedData.email,
				{
					redirectTo: `${request.nextUrl.origin}/invite-callback`,
					data: {
						full_name: validatedData.full_name,
						email: validatedData.email,
					},
				}
			);

				if (emailError) {
					console.error('Error sending invite email:', emailError);
				}

				return NextResponse.json({
					message: 'User reactivated and invitation sent',
					user_id: existingProfile.id,
				});
				}
			}

			// User exists but not in this org - add membership using admin client
			const { error: membershipInsertError } = await adminClient.from('memberships').insert({
				org_id: membership.org_id,
				user_id: existingProfile.id,
				role: validatedData.role,
				hourly_rate_sek: validatedData.hourly_rate_sek,
				salary_per_hour_sek: validatedData.salary_per_hour_sek,
				is_active: true,
			});

			if (membershipInsertError) {
				console.error('Error creating membership:', membershipInsertError);
				return NextResponse.json({ error: 'Failed to add user to organization' }, { status: 500 });
			}

				// Send invitation email with redirect to invite callback page
				const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(
					validatedData.email,
					{
						redirectTo: `${request.nextUrl.origin}/invite-callback`,
						data: {
							full_name: validatedData.full_name,
							email: validatedData.email,
						},
					}
				);

			if (emailError) {
				console.error('Error sending invite email:', emailError);
			}

			return NextResponse.json({
				message: 'User added to organization and invitation sent',
				user_id: existingProfile.id,
			});
		}

		// User doesn't exist - create invitation
		// Note: With Supabase, we use inviteUserByEmail which creates the user and sends an invite
		// The user will receive an email to set their password, then redirect to invite callback page
		const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
			validatedData.email,
			{
				redirectTo: `${request.nextUrl.origin}/invite-callback`,
				data: {
					full_name: validatedData.full_name,
					email: validatedData.email,
				},
			}
		);

		if (inviteError) {
			console.error('Error inviting user:', inviteError);
			return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
		}

		// Get the invited user's ID from the invite response
		if (!inviteData?.user?.id) {
			console.error('No user ID in invite response');
			return NextResponse.json({ error: 'Failed to get user ID' }, { status: 500 });
		}

		const invitedUserId = inviteData.user.id;

		// Create or update profile using admin client (bypasses RLS)
		// Use upsert to handle case where profile already exists
		const { data: newProfile, error: profileError } = await adminClient
			.from('profiles')
			.upsert({
				id: invitedUserId, // Use the auth user ID
				email: validatedData.email,
				full_name: validatedData.full_name,
				updated_at: new Date().toISOString(),
			}, {
				onConflict: 'id', // On conflict with id, update the row
			})
			.select()
			.single();

		if (profileError) {
			console.error('Error creating/updating profile:', profileError);
			return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
		}

		// Check if membership already exists
		const { data: existingOrgMembership } = await adminClient
			.from('memberships')
			.select('id, is_active')
			.eq('user_id', invitedUserId)
			.eq('org_id', membership.org_id)
			.single();

		if (existingOrgMembership) {
			// Update existing membership
			const { error: membershipUpdateError } = await adminClient
				.from('memberships')
				.update({
					role: validatedData.role,
					hourly_rate_sek: validatedData.hourly_rate_sek,
					salary_per_hour_sek: validatedData.salary_per_hour_sek,
					is_active: true,
					updated_at: new Date().toISOString(),
				})
				.eq('id', existingOrgMembership.id);

			if (membershipUpdateError) {
				console.error('Error updating membership:', membershipUpdateError);
				return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
			}
		} else {
			// Create new membership using admin client (bypasses RLS)
			const { error: membershipInsertError } = await adminClient.from('memberships').insert({
				org_id: membership.org_id,
				user_id: invitedUserId,
				role: validatedData.role,
				hourly_rate_sek: validatedData.hourly_rate_sek,
				salary_per_hour_sek: validatedData.salary_per_hour_sek,
				is_active: true,
			});

			if (membershipInsertError) {
				console.error('Error creating membership:', membershipInsertError);
				return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
			}
		}

		return NextResponse.json({
			message: 'Invitation sent successfully',
			user_id: newProfile.id,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
		}

		console.error('Error inviting user:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

