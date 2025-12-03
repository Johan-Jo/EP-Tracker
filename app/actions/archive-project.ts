'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Archive a project
 * Server action for archiving projects
 * 
 * NOTE: Uses admin client to bypass RLS after verifying permissions
 * Only admins can archive projects
 */
export async function archiveProject(projectId: string) {
	const supabase = await createClient();
	
	// Get authenticated user
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		console.error('Auth error:', authError);
		throw new Error('Inte autentiserad');
	}

	// Get the project to verify access and check if already archived
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('org_id, is_archived')
		.eq('id', projectId)
		.single();

	if (projectError || !project) {
		console.error('Project error:', projectError);
		throw new Error('Projekt hittades inte');
	}

	// Check if already archived
	if (project.is_archived) {
		throw new Error('Projektet är redan arkiverat');
	}

	// Get membership for role check
	const { data: membership, error: membershipError } = await supabase
		.from('memberships')
		.select('role')
		.eq('user_id', user.id)
		.eq('org_id', project.org_id)
		.eq('is_active', true)
		.single();

	if (membershipError || !membership) {
		console.error('Membership error:', membershipError);
		throw new Error('Ingen aktiv organisation');
	}

	// Verify user has permission (only admin can archive)
	if (membership.role !== 'admin') {
		throw new Error('Endast admin kan arkivera projekt');
	}

	// Use admin client to bypass RLS (we've already verified permissions above)
	const adminClient = createAdminClient();

	// Archive the project
	const { data: updatedProject, error: updateError } = await adminClient
		.from('projects')
		.update({
			is_archived: true,
			archived_at: new Date().toISOString(),
			archived_by: user.id,
			updated_at: new Date().toISOString(),
		})
		.eq('id', projectId)
		.select()
		.single();

	if (updateError) {
		console.error('Error archiving project:', updateError);
		throw new Error('Kunde inte arkivera projekt');
	}

	// Revalidate relevant paths
	revalidatePath('/dashboard/projects');
	revalidatePath(`/dashboard/projects/${projectId}`);
	
	return {
		success: true,
		project: updatedProject,
	};
}

/**
 * Unarchive a project
 * Server action for unarchiving projects
 * 
 * NOTE: Uses admin client to bypass RLS after verifying permissions
 * Only admins can unarchive projects
 */
export async function unarchiveProject(projectId: string) {
	const supabase = await createClient();
	
	// Get authenticated user
	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		console.error('Auth error:', authError);
		throw new Error('Inte autentiserad');
	}

	// Get the project to verify access and check if already unarchived
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('org_id, is_archived')
		.eq('id', projectId)
		.single();

	if (projectError || !project) {
		console.error('Project error:', projectError);
		throw new Error('Projekt hittades inte');
	}

	// Check if already unarchived
	if (!project.is_archived) {
		throw new Error('Projektet är inte arkiverat');
	}

	// Get membership for role check
	const { data: membership, error: membershipError } = await supabase
		.from('memberships')
		.select('role')
		.eq('user_id', user.id)
		.eq('org_id', project.org_id)
		.eq('is_active', true)
		.single();

	if (membershipError || !membership) {
		console.error('Membership error:', membershipError);
		throw new Error('Ingen aktiv organisation');
	}

	// Verify user has permission (only admin can unarchive)
	if (membership.role !== 'admin') {
		throw new Error('Endast admin kan återaktivera projekt');
	}

	// Use admin client to bypass RLS (we've already verified permissions above)
	const adminClient = createAdminClient();

	// Unarchive the project
	const { data: updatedProject, error: updateError } = await adminClient
		.from('projects')
		.update({
			is_archived: false,
			archived_at: null,
			archived_by: null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', projectId)
		.select()
		.single();

	if (updateError) {
		console.error('Error unarchiving project:', updateError);
		throw new Error('Kunde inte återaktivera projekt');
	}

	// Revalidate relevant paths
	revalidatePath('/dashboard/projects');
	revalidatePath(`/dashboard/projects/${projectId}`);
	
	return {
		success: true,
		project: updatedProject,
	};
}

