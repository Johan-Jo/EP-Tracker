import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { sendApprovalConfirmedNotification } from '@/lib/notifications'; // EPIC 25: Push notifications

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can approve
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { entry_ids } = await request.json();

		if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
			return NextResponse.json(
				{ error: 'entry_ids array is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Update all entries to approved
		const { data, error } = await supabase
			.from('time_entries')
			.update({
				status: 'approved',
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.in('id', entry_ids)
			.eq('org_id', membership.org_id)
			.select();

		if (error) {
			console.error('Error approving time entries:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// EPIC 25: Send approval confirmation notifications
		// Don't await - fire and forget
		if (data && data.length > 0) {
			// Group by user_id
			const userIds = [...new Set(data.map(entry => entry.user_id))];
			
			for (const userId of userIds) {
				const userEntries = data.filter(e => e.user_id === userId);
				sendApprovalConfirmedNotification({
					userId,
					approverName: user.user_metadata?.full_name || user.email || 'Admin',
					entryCount: userEntries.length,
				}).catch((err) => {
					console.error('[Approval] Failed to send notification:', err);
				});
			}
		}

		return NextResponse.json({ 
			success: true, 
			approved_count: data?.length || 0 
		});
	} catch (error) {
		console.error('Approval error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

