import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { phaseSchema } from '@/lib/schemas/project';

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { projectId, ...phaseData } = body;

		if (!projectId) {
			return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
		}

		// Verify user has access to project
		const { data: project } = await supabase
			.from('projects')
			.select('org_id')
			.eq('id', projectId)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

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

		// Validate phase data
		const validatedData = phaseSchema.parse(phaseData);

		// Get next sort_order
		const { data: existingPhases } = await supabase
			.from('phases')
			.select('sort_order')
			.eq('project_id', projectId)
			.order('sort_order', { ascending: false })
			.limit(1);

		const nextSortOrder = existingPhases && existingPhases.length > 0 
			? existingPhases[0].sort_order + 1 
			: 0;

		// Create phase
		const { data: phase, error } = await supabase
			.from('phases')
			.insert({
				project_id: projectId,
				...validatedData,
				sort_order: nextSortOrder,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating phase:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(phase);
	} catch (error) {
		console.error('Error in POST /api/phases:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}

