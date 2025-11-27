import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { z } from 'zod';

const createWorkOrderAssignmentSchema = z.object({
	user_id: z.string().uuid(),
	role: z.string().nullable().optional(),
	is_responsible: z.boolean().optional().default(false),
	assignment_status: z.enum(['TILLDELAD', 'ACCEPTERAD', 'PÅBÖRJAD', 'KLAR']).optional().default('TILLDELAD'),
});

// POST /api/work-orders/[id]/assignments - Add assignment to work order
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin/foreman can add assignments
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Insufficient permissions' },
				{ status: 403 }
			);
		}

		const supabase = await createClient();

		// Check if work order exists and belongs to organization
		const { data: workOrder, error: checkError } = await supabase
			.from('work_orders')
			.select('id, organization_id')
			.eq('id', id)
			.single();

		if (checkError || !workOrder) {
			return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
		}

		if (workOrder.organization_id !== membership.org_id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const validated = createWorkOrderAssignmentSchema.parse(body);

		// Check if assignment already exists
		const { data: existing } = await supabase
			.from('work_order_assignments')
			.select('id')
			.eq('work_order_id', id)
			.eq('user_id', validated.user_id)
			.single();

		if (existing) {
			return NextResponse.json(
				{ error: 'User is already assigned to this work order' },
				{ status: 400 }
			);
		}

		// Insert assignment
		const { data: assignment, error: insertError } = await supabase
			.from('work_order_assignments')
			.insert({
				work_order_id: id,
				user_id: validated.user_id,
				role: validated.role,
				is_responsible: validated.is_responsible,
				assignment_status: validated.assignment_status,
			})
			.select(`
				id,
				user_id,
				role,
				is_responsible,
				assignment_status,
				user:profiles(id, full_name, email)
			`)
			.single();

		if (insertError) {
			console.error('Error creating assignment:', insertError);
			return NextResponse.json(
				{ error: insertError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({ assignment }, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Validation error', details: error.errors },
				{ status: 400 }
			);
		}
		console.error('Error in POST /api/work-orders/[id]/assignments:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

