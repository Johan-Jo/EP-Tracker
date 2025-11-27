import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// GET /api/mobile/work-orders/today - Get today's work orders for the current user
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Get today's date range (start and end of day)
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		// Fetch work orders assigned to this user for today
		const { data: workOrders, error } = await supabase
			.from('work_orders')
			.select(`
				id,
				work_order_number,
				title,
				description,
				project_id,
				organization_id,
				planned_start_at,
				planned_end_at,
				all_day,
				status,
				priority,
				location_address,
				location_city,
				location_zip,
				location_lat,
				location_lng,
				actual_start_at,
				actual_end_at,
				project:projects(
					id,
					name,
					project_number,
					site_address
				),
				customer:customers(
					id,
					type,
					company_name,
					first_name,
					last_name
				)
			`)
			.eq('organization_id', membership.org_id)
			.gte('planned_start_at', todayStart.toISOString())
			.lte('planned_start_at', todayEnd.toISOString())
			.in('status', ['assigned', 'in_progress'])
			.order('planned_start_at', { ascending: true });

		if (error) {
			console.error('Error fetching work orders:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Filter to only work orders assigned to this user
		const { data: assignments } = await supabase
			.from('work_order_assignments')
			.select('work_order_id')
			.eq('user_id', user.id)
			.in('work_order_id', workOrders?.map(wo => wo.id) || []);

		const assignedWorkOrderIds = new Set(assignments?.map(a => a.work_order_id) || []);
		const userWorkOrders = workOrders?.filter(wo => assignedWorkOrderIds.has(wo.id)) || [];

		return NextResponse.json({
			work_orders: userWorkOrders,
		});
	} catch (error) {
		console.error('Error in GET /api/mobile/work-orders/today:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

