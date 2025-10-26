'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ProjectFormData } from '@/lib/schemas/project';

/**
 * Create a new project
 * Server action for creating projects
 */
export async function createProject(data: ProjectFormData) {
	// Server actions need fresh auth check (can't use cached getSession)
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		throw new Error('Inte autentiserad');
	}

	// Get membership for org_id
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership) {
		throw new Error('Ingen aktiv organisation');
	}

	const { data: project, error } = await supabase
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
	redirect(`/dashboard/projects/${project.id}`);
}

