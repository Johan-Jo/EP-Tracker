'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ProjectFormData } from '@/lib/schemas/project';

/**
 * Create a new project
 * Server action for creating projects
 * 
 * NOTE: Uses admin client to bypass RLS after verifying permissions
 * This is necessary because auth.uid() doesn't work correctly in server actions
 */
export async function createProject(data: ProjectFormData) {
	const supabase = await createClient();
	
	// Get authenticated user
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		console.error('Auth error:', authError);
		throw new Error('Inte autentiserad');
	}

	// Get membership for org_id and role check
	const { data: membership, error: membershipError } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (membershipError || !membership) {
		console.error('Membership error:', membershipError);
		throw new Error('Ingen aktiv organisation');
	}

	// Verify user has permission (admin or foreman)
	if (!['admin', 'foreman'].includes(membership.role)) {
		throw new Error('Endast admin eller arbetsledare kan skapa projekt');
	}

	// Use admin client to bypass RLS (we've already verified permissions above)
	const adminClient = createAdminClient();
	
	const { data: project, error } = await adminClient
		.from('projects')
		.insert({
			org_id: membership.org_id,
			created_by: user.id,
			...data,
		})
		.select()
		.single();

	if (error) {
		console.error('Error creating project:', error);
		throw new Error(error.message);
	}

	revalidatePath('/dashboard/projects');
	
	// Return project instead of redirecting to avoid NEXT_REDIRECT error in UI
	return {
		success: true,
		project,
	};
}

