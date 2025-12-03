import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

/**
 * Archive a project
 * Only admins can archive projects
 */
export async function POST(request: NextRequest, context: RouteContext<RouteParams>) {
	const { id } = await resolveRouteParams(context);
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
			.select('org_id, is_archived')
			.eq('id', id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		// Check if already archived
		if (project.is_archived) {
			return NextResponse.json({ error: 'Project is already archived' }, { status: 400 });
		}

		// Check if user is admin (only admins can archive)
		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership || membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can archive projects' }, { status: 403 });
		}

		// Archive the project
		const { data: updatedProject, error: updateError } = await supabase
			.from('projects')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
				archived_by: user.id,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Archive Project] Update error:', updateError);
			return NextResponse.json({ error: 'Failed to archive project' }, { status: 500 });
		}

		return NextResponse.json({ project: updatedProject }, { status: 200 });
	} catch (error) {
		console.error('Error in POST /api/projects/[id]/archive:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Unarchive a project
 * Only admins can unarchive projects
 */
export async function DELETE(request: NextRequest, context: RouteContext<RouteParams>) {
	const { id } = await resolveRouteParams(context);
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
			.select('org_id, is_archived')
			.eq('id', id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		// Check if already unarchived
		if (!project.is_archived) {
			return NextResponse.json({ error: 'Project is not archived' }, { status: 400 });
		}

		// Check if user is admin (only admins can unarchive)
		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership || membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can unarchive projects' }, { status: 403 });
		}

		// Unarchive the project
		const { data: updatedProject, error: updateError } = await supabase
			.from('projects')
			.update({
				is_archived: false,
				archived_at: null,
				archived_by: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select()
			.single();

		if (updateError) {
			console.error('[Unarchive Project] Update error:', updateError);
			return NextResponse.json({ error: 'Failed to unarchive project' }, { status: 500 });
		}

		return NextResponse.json({ project: updatedProject }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/projects/[id]/archive:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

