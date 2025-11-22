import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { createWorkOrderAssignmentSchema } from '@/lib/schemas/work-order';

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/work-orders/[id]/assignments - List assignments for work order
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const supabase = await createClient();

		// Verify work order exists and user has access
		const { data: workOrder, error: workOrderError } = await supabase
			.from('work_orders')
			.select('id, organization_id')
			.eq('id', id)
			.eq('organization_id', membership.org_id)
			.single();

		if (workOrderError || !workOrder) {
			return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
		}

		// Fetch assignments
		const { data: assignments, error } = await supabase
			.from('work_order_assignments')
			.select(`
				*,
				user:profiles(id, full_name, email)
			`)
			.eq('work_order_id', id)
			.order('is_responsible', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching assignments:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ assignments: assignments || [] });
	} catch (error) {
		console.error('Error in GET /api/work-orders/[id]/assignments:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// POST /api/work-orders/[id]/assignments - Add assignment(s)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

		const { id } = await params;
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

		const body = await request.json();
		
		// Support both single assignment and array
		const assignments = Array.isArray(body) ? body : [body];
		
		const assignmentData = assignments.map((assignment) => {
			const validated = createWorkOrderAssignmentSchema.parse({
				...assignment,
				work_order_id: id,
			});
			return {
				work_order_id: id,
				user_id: validated.user_id,
				role: validated.role,
				is_responsible: validated.is_responsible ?? false,
				assignment_status: validated.assignment_status ?? 'TILLDELAD',
			};
		});

		const { data: createdAssignments, error } = await supabase
			.from('work_order_assignments')
			.insert(assignmentData)
			.select(`
				*,
				user:profiles(id, full_name, email)
			`);

		if (error) {
			console.error('Error creating assignments:', error);
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{ assignments: createdAssignments },
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof Error && error.name === 'ZodError') {
			return NextResponse.json(
				{ error: 'Validation error', details: error },
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

