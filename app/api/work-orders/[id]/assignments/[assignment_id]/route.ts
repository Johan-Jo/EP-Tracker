import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

interface RouteParams {
	params: Promise<{ id: string; assignment_id: string }>;
}

// DELETE /api/work-orders/[id]/assignments/[assignment_id] - Remove assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check permissions (admin/foreman only)
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Insufficient permissions' },
				{ status: 403 }
			);
		}

		const { id, assignment_id } = await params;
		const supabase = await createClient();

		// Verify work order exists and belongs to organization
		const { data: workOrder, error: workOrderError } = await supabase
			.from('work_orders')
			.select('id, organization_id')
			.eq('id', id)
			.eq('organization_id', membership.org_id)
			.single();

		if (workOrderError || !workOrder) {
			return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
		}

		// Verify assignment belongs to work order
		const { data: assignment, error: assignmentError } = await supabase
			.from('work_order_assignments')
			.select('id')
			.eq('id', assignment_id)
			.eq('work_order_id', id)
			.single();

		if (assignmentError || !assignment) {
			return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
		}

		// Delete assignment
		const { error: deleteError } = await supabase
			.from('work_order_assignments')
			.delete()
			.eq('id', assignment_id);

		if (deleteError) {
			console.error('Error deleting assignment:', deleteError);
			return NextResponse.json(
				{ error: deleteError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true }, { status: 204 });
	} catch (error) {
		console.error('Error in DELETE /api/work-orders/[id]/assignments/[assignment_id]:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

