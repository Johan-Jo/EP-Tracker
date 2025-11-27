import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// POST /api/work-orders/[id]/approve-time-manager
// This is called when a MANAGER/ADMIN approves the worker's confirmed time
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if user is manager/admin/owner
		if (!['admin', 'manager', 'owner'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden - Manager/Admin role required' }, { status: 403 });
		}

		const url = new URL(request.url);
		const token = url.searchParams.get('token');

		if (!token) {
			return NextResponse.json({ error: 'Missing token' }, { status: 400 });
		}

		const supabase = await createClient();

		// Verify that work order exists, belongs to org and token matches
		const { data: workOrder, error } = await supabase
			.from('work_orders')
			.select('id, organization_id, actual_time_manager_approval_token, actual_time_manager_approved_at')
			.eq('id', id)
			.eq('actual_time_manager_approval_token', token)
			.single();

		if (error || !workOrder) {
			return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
		}

		if (workOrder.organization_id !== membership.org_id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Check if already approved
		if (workOrder.actual_time_manager_approved_at) {
			return NextResponse.json({ 
				success: true, 
				message: 'Time already approved by manager',
				alreadyApproved: true 
			});
		}

		// Mark actual time as approved by this manager/admin
		const { error: updateError } = await supabase
			.from('work_orders')
			.update({
				actual_time_manager_approved_by_id: user.id,
				actual_time_manager_approved_at: new Date().toISOString(),
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error approving work order time (manager):', updateError);
			return NextResponse.json({ error: 'Failed to approve time' }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error in POST /api/work-orders/[id]/approve-time-manager:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

