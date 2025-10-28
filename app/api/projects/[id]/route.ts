import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, props: RouteParams) {
	const params = await props.params;
	const supabase = await createClient();

	try {
		// Check authentication
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get the project to verify access
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('org_id')
			.eq('id', params.id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		// Check if user has permission to update (must be admin or foreman)
		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership || !['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Parse request body
		const body = await request.json();
		const { name, project_number, client_name, site_address, status, budget_mode, budget_hours, budget_amount, alert_settings } = body;

		// Prepare update object (only include fields that are provided)
		const updateData: any = {
			updated_at: new Date().toISOString(),
		};

		if (name !== undefined) updateData.name = name;
		if (project_number !== undefined) updateData.project_number = project_number;
		if (client_name !== undefined) updateData.client_name = client_name;
		if (site_address !== undefined) updateData.site_address = site_address;
		if (status !== undefined) updateData.status = status;
		if (budget_mode !== undefined) updateData.budget_mode = budget_mode;
		if (budget_hours !== undefined) updateData.budget_hours = budget_hours;
		if (budget_amount !== undefined) updateData.budget_amount = budget_amount;
		if (alert_settings !== undefined) updateData.alert_settings = alert_settings;

		// Update project
		const { data: updatedProject, error: updateError } = await supabase
			.from('projects')
			.update(updateData)
			.eq('id', params.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating project:', updateError);
			return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
		}

		return NextResponse.json({ project: updatedProject }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/projects/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

