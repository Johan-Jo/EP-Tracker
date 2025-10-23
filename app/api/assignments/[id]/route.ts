import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAssignmentSchema } from '@/lib/schemas/planning';

// PATCH /api/assignments/[id] - Update assignment
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Check permissions (admin/foreman only)
		if (!['admin', 'foreman', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = updateAssignmentSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Verify assignment exists and belongs to user's organization
		const { data: existing, error: fetchError } = await supabase
			.from('assignments')
			.select('id, org_id')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existing) {
			return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
		}

		// Update assignment
		const { data: updated, error: updateError } = await supabase
			.from('assignments')
			.update(data)
			.eq('id', id)
			.select(`
				*,
				project:projects(id, name, project_number, color, client_name),
				user:profiles!assignments_user_id_fkey(id, full_name, email),
				mobile_notes(*)
			`)
			.single();

		if (updateError) {
			console.error('[PATCH /api/assignments/:id] Error updating assignment:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ assignment: updated }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/assignments/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/assignments/[id] - Delete assignment
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Check permissions (admin/foreman only)
		if (!['admin', 'foreman', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		// Verify assignment exists and belongs to user's organization
		const { data: existing, error: fetchError } = await supabase
			.from('assignments')
			.select('id, org_id')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existing) {
			return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
		}

		// Delete assignment (will cascade delete mobile_notes)
		const { error: deleteError } = await supabase
			.from('assignments')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting assignment:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/assignments/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

