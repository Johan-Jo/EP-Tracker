import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { format, startOfDay, endOfDay } from 'date-fns';

// GET /api/work-orders/today - Get today's work orders for current user
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Get today's date (consider timezone from query param if provided)
		const searchParams = request.nextUrl.searchParams;
		const timezone = searchParams.get('timezone') || 'Europe/Stockholm';
		const today = new Date();
		const todayStart = startOfDay(today).toISOString();
		const todayEnd = endOfDay(today).toISOString();

		// Fetch work orders where:
		// - User is assigned (via work_order_assignments)
		// - AND (planned_start_at is today OR status is PÅGÅENDE)
		const { data: workOrders, error } = await supabase
			.from('work_orders')
			.select(`
				*,
				project:projects(id, name, project_number),
				customer:customers(id, type, company_name, first_name, last_name),
				assignments:work_order_assignments!inner(
					id,
					user_id,
					is_responsible,
					assignment_status
				)
			`)
			.eq('organization_id', membership.org_id)
			.eq('assignments.user_id', user.id)
			.or(`planned_start_at.gte.${todayStart},planned_start_at.lte.${todayEnd},status.eq.PÅGÅENDE`)
			.order('planned_start_at', { ascending: true, nullsFirst: false });

		if (error) {
			console.error('Error fetching today\'s work orders:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Filter to only work orders where user is actually assigned
		const filteredWorkOrders = (workOrders || []).filter((wo) => {
			if (!wo.assignments || !Array.isArray(wo.assignments)) return false;
			return wo.assignments.some((assignment: any) => assignment.user_id === user.id);
		});

		return NextResponse.json({ workOrders: filteredWorkOrders });
	} catch (error) {
		console.error('Error in GET /api/work-orders/today:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

