import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { phaseSchema } from '@/lib/schemas/project';

interface RouteParams {
	params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, props: RouteParams) {
	const params = await props.params;
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();

		// Get phase and verify access
		const { data: phase } = await supabase
			.from('phases')
			.select('project_id, projects(org_id)')
			.eq('id', params.id)
			.single();

		if (!phase) {
			return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
		}

		const orgId = (phase as any).projects.org_id;

		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', orgId)
			.eq('is_active', true)
			.single();

		if (!membership || !['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Validate phase data
		const validatedData = phaseSchema.partial().parse(body);

		// Update phase
		const { data: updatedPhase, error } = await supabase
			.from('phases')
			.update(validatedData)
			.eq('id', params.id)
			.select()
			.single();

		if (error) {
			console.error('Error updating phase:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(updatedPhase);
	} catch (error) {
		console.error('Error in PATCH /api/phases/[id]:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest, props: RouteParams) {
	const params = await props.params;
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get phase and verify access
		const { data: phase } = await supabase
			.from('phases')
			.select('project_id, projects(org_id)')
			.eq('id', params.id)
			.single();

		if (!phase) {
			return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
		}

		const orgId = (phase as any).projects.org_id;

		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', orgId)
			.eq('is_active', true)
			.single();

		if (!membership || !['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Delete phase
		const { error } = await supabase.from('phases').delete().eq('id', params.id);

		if (error) {
			console.error('Error deleting phase:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error in DELETE /api/phases/[id]:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}

