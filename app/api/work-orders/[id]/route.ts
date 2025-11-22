import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { updateWorkOrderSchema } from '@/lib/schemas/work-order';

interface RouteParams {
	params: Promise<{ id: string }>;
}

// GET /api/work-orders/[id] - Get single work order with relations
export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const supabase = await createClient();

		const { data: workOrder, error } = await supabase
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
			.eq('id', id)
			.eq('organization_id', membership.org_id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
			}
			console.error('Error fetching work order:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(workOrder);
	} catch (error) {
		console.error('Error in GET /api/work-orders/[id]:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// PATCH /api/work-orders/[id] - Update work order
export async function PATCH(request: NextRequest, { params }: RouteParams) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const supabase = await createClient();

		// Check if work order exists and user has access
		const { data: existingWorkOrder, error: checkError } = await supabase
			.from('work_orders')
			.select('id, organization_id')
			.eq('id', id)
			.eq('organization_id', membership.org_id)
			.single();

		if (checkError || !existingWorkOrder) {
			return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
		}

		// Check permissions: admin/foreman can update all, workers can update assigned
		if (!['admin', 'foreman'].includes(membership.role)) {
			// Check if user is assigned to this work order
			const { data: assignment } = await supabase
				.from('work_order_assignments')
				.select('id')
				.eq('work_order_id', id)
				.eq('user_id', user.id)
				.single();

			if (!assignment) {
				return NextResponse.json(
					{ error: 'Insufficient permissions' },
					{ status: 403 }
				);
			}
		}

		const body = await request.json();
		const validated = updateWorkOrderSchema.parse(body);

		// Extract assignments if provided
		const { assignments, ...updateData } = validated;

		// Handle status change to KLAR
		if (updateData.status === 'KLAR' && existingWorkOrder.status !== 'KLAR') {
			updateData.closed_at = new Date().toISOString();
			updateData.closed_by_id = user.id;
		}

		// Update work order
		const { data: workOrder, error: updateError } = await supabase
			.from('work_orders')
			.update(updateData)
			.eq('id', id)
			.select(`
				*,
				project:projects(id, name, project_number),
				customer:customers(id, type, company_name, first_name, last_name),
				created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email),
				closed_by:profiles!work_orders_closed_by_id_fkey(id, full_name, email)
			`)
			.single();

		if (updateError) {
			console.error('Error updating work order:', updateError);
			return NextResponse.json(
				{ error: updateError.message },
				{ status: 500 }
			);
		}

		// Update assignments if provided
		if (assignments !== undefined) {
			// Delete existing assignments
			await supabase
				.from('work_order_assignments')
				.delete()
				.eq('work_order_id', id);

			// Insert new assignments
			if (assignments.length > 0) {
				const assignmentData = assignments.map((assignment) => ({
					work_order_id: id,
					user_id: assignment.user_id,
					role: assignment.role,
					is_responsible: assignment.is_responsible ?? false,
					assignment_status: assignment.assignment_status ?? 'TILLDELAD',
				}));

				await supabase
					.from('work_order_assignments')
					.insert(assignmentData);
			}
		}

		// Fetch updated work order with all relations
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
				created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email),
				closed_by:profiles!work_orders_closed_by_id_fkey(id, full_name, email)
			`)
			.eq('id', id)
			.single();

		if (fetchError) {
			console.error('Error fetching updated work order:', fetchError);
			return NextResponse.json(workOrder, { status: 200 });
		}

		return NextResponse.json(workOrderWithRelations);
	} catch (error) {
		if (error instanceof Error && error.name === 'ZodError') {
			return NextResponse.json(
				{ error: 'Validation error', details: error },
				{ status: 400 }
			);
		}
		console.error('Error in PATCH /api/work-orders/[id]:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// DELETE /api/work-orders/[id] - Delete work order
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

		const { id } = await params;
		const supabase = await createClient();

		// Check if work order exists and belongs to organization
		const { data: existingWorkOrder, error: checkError } = await supabase
			.from('work_orders')
			.select('id')
			.eq('id', id)
			.eq('organization_id', membership.org_id)
			.single();

		if (checkError || !existingWorkOrder) {
			return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
		}

		// Delete work order (CASCADE will delete assignments)
		const { error: deleteError } = await supabase
			.from('work_orders')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting work order:', deleteError);
			return NextResponse.json(
				{ error: deleteError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true }, { status: 204 });
	} catch (error) {
		console.error('Error in DELETE /api/work-orders/[id]:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

