import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTimeEntrySchema } from '@/lib/schemas/time-entry';

// PATCH /api/time/entries/[id] - Update time entry
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

		// Parse and validate request body
		const body = await request.json();
		const validation = updateTimeEntrySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Check if entry exists and user has permission
		const { data: existingEntry, error: fetchError } = await supabase
			.from('time_entries')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingEntry) {
			return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot edit time entries' }, { status: 403 });
		}

		// Only allow editing own entries (unless admin/foreman)
		if (membership.role === 'worker' && existingEntry.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		// Prevent editing approved entries (unless admin)
		if (existingEntry.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot edit approved time entries' }, { status: 403 });
		}

		// Update time entry
		const { data: entry, error: updateError } = await supabase
			.from('time_entries')
			.update({
				project_id: data.project_id,
				phase_id: data.phase_id,
				work_order_id: data.work_order_id,
				task_label: data.task_label,
				start_at: data.start_at,
				stop_at: data.stop_at,
				notes: data.notes,
				status: data.status,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select(`
				*,
				project:projects(id, name, project_number),
				phase:phases(id, name),
				work_order:work_orders(id, name)
			`)
			.single();

		if (updateError) {
			console.error('Error updating time entry:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ entry }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/time/entries/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/time/entries/[id] - Delete time entry
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

		// Check if entry exists and user has permission
		const { data: existingEntry, error: fetchError } = await supabase
			.from('time_entries')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingEntry) {
			return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot delete time entries' }, { status: 403 });
		}

		// Only allow deleting own entries (unless admin/foreman)
		if (membership.role === 'worker' && existingEntry.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		// Prevent deleting approved entries (unless admin)
		if (existingEntry.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot delete approved time entries' }, { status: 403 });
		}

		// Delete time entry
		const { error: deleteError } = await supabase
			.from('time_entries')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting time entry:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ message: 'Time entry deleted' }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/time/entries/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

