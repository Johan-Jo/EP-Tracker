import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { createWorkOrderSchema } from '@/lib/schemas/work-order';

// GET /api/work-orders - List work orders with filters
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const start_date = searchParams.get('start_date');
		const end_date = searchParams.get('end_date');
		const status = searchParams.get('status');
		const project_id = searchParams.get('project_id');
		const customer_id = searchParams.get('customer_id');
		const user_id = searchParams.get('user_id'); // assigned user
		const limit = parseInt(searchParams.get('limit') || '200');
		const offset = parseInt(searchParams.get('offset') || '0');

		// Build query with relations
		let query = supabase
			.from('work_orders')
			.select(`
				*,
				project:projects(id, name, project_number),
				customer:customers(id, type, company_name, first_name, last_name),
				assignments:work_order_assignments(
					id,
					user_id,
					role,
					is_responsible,
					assignment_status,
					user:profiles(id, full_name, email)
				),
				created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email),
				closed_by:profiles!work_orders_closed_by_id_fkey(id, full_name, email)
			`)
			.eq('organization_id', membership.org_id)
			.order('planned_start_at', { ascending: true, nullsFirst: false })
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		// Apply filters
		if (start_date) {
			query = query.gte('planned_start_at', start_date);
		}
		if (end_date) {
			query = query.lte('planned_start_at', `${end_date}T23:59:59`);
		}
		if (status) {
			query = query.eq('status', status);
		}
		if (project_id) {
			query = query.eq('project_id', project_id);
		}
		if (customer_id) {
			query = query.eq('customer_id', customer_id);
		}
		if (user_id) {
			// Filter by assigned user
			query = query.eq('assignments.user_id', user_id);
		}

		const { data: workOrders, error } = await query;

		if (error) {
			console.error('Error fetching work orders:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ workOrders: workOrders || [] });
	} catch (error) {
		console.error('Error in GET /api/work-orders:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// POST /api/work-orders - Create work order with assignments
export async function POST(request: NextRequest) {
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

		const body = await request.json();
		const validated = createWorkOrderSchema.parse({
			...body,
			organization_id: membership.org_id,
		});

		const supabase = await createClient();

		// Extract assignments if provided
		const { assignments, ...workOrderData } = validated;

		// Create work order
		const { data: workOrder, error: workOrderError } = await supabase
			.from('work_orders')
			.insert({
				...workOrderData,
				organization_id: membership.org_id,
				created_by_id: user.id,
			})
			.select(`
				*,
				project:projects(id, name, project_number),
				customer:customers(id, type, company_name, first_name, last_name),
				created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email)
			`)
			.single();

		if (workOrderError) {
			console.error('Error creating work order:', workOrderError);
			return NextResponse.json(
				{ error: workOrderError.message },
				{ status: 500 }
			);
		}

		// Create assignments if provided
		if (assignments && assignments.length > 0) {
			const assignmentData = assignments.map((assignment) => ({
				work_order_id: workOrder.id,
				user_id: assignment.user_id,
				role: assignment.role,
				is_responsible: assignment.is_responsible ?? false,
				assignment_status: assignment.assignment_status ?? 'TILLDELAD',
			}));

			const { error: assignmentError } = await supabase
				.from('work_order_assignments')
				.insert(assignmentData);

			if (assignmentError) {
				console.error('Error creating assignments:', assignmentError);
				// Continue anyway - work order is created
			}
		}

		// Fetch work order with all relations
		const { data: workOrderWithRelations, error: fetchError } = await supabase
			.from('work_orders')
			.select(`
				*,
				project:projects(id, name, project_number),
				customer:customers(id, type, company_name, first_name, last_name),
				assignments:work_order_assignments(
					id,
					user_id,
					role,
					is_responsible,
					assignment_status,
					user:profiles(id, full_name, email)
				),
				created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email)
			`)
			.eq('id', workOrder.id)
			.single();

		if (fetchError) {
			console.error('Error fetching created work order:', fetchError);
			return NextResponse.json(
				{ error: 'Work order created but failed to fetch' },
				{ status: 500 }
			);
		}

		return NextResponse.json(workOrderWithRelations, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.name === 'ZodError') {
			return NextResponse.json(
				{ error: 'Validation error', details: error },
				{ status: 400 }
			);
		}
		console.error('Error in POST /api/work-orders:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}




