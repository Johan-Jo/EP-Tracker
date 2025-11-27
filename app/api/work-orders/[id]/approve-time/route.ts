import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { sendWorkOrderManagerApprovalEmail } from '@/lib/work-orders/send-manager-approval-email';

// POST /api/work-orders/[id]/approve-time
// This is called when a WORKER confirms their registered time
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
			.select('id, organization_id, actual_time_approval_token, actual_time_worker_confirmed_at')
			.eq('id', id)
			.eq('actual_time_approval_token', token)
			.single();

		if (error || !workOrder) {
			return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
		}

		if (workOrder.organization_id !== membership.org_id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Check if already confirmed
		if (workOrder.actual_time_worker_confirmed_at) {
			return NextResponse.json({ 
				success: true, 
				message: 'Time already confirmed',
				alreadyConfirmed: true 
			});
		}

		// Mark actual time as confirmed by this worker
		const { error: updateError } = await supabase
			.from('work_orders')
			.update({
				actual_time_worker_confirmed_by_id: user.id,
				actual_time_worker_confirmed_at: new Date().toISOString(),
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error confirming work order time:', updateError);
			return NextResponse.json({ error: 'Failed to confirm time' }, { status: 500 });
		}

		// Trigger manager approval email (fire and forget)
		sendWorkOrderManagerApprovalEmail({
			supabase,
			workOrderId: id,
			orgId: membership.org_id,
		}).catch((err) => {
			console.error('[Approve Time] Failed to send manager approval email:', err);
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error in POST /api/work-orders/[id]/approve-time:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


