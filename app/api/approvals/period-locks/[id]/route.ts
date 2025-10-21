import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/approvals/period-locks/[id] - Unlock period
export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await context.params;
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin can unlock periods
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can unlock periods' }, { status: 403 });
		}

		const supabase = await createClient();

		// Verify lock exists and belongs to organization
		const { data: lock, error: fetchError } = await supabase
			.from('period_locks')
			.select('*')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !lock) {
			return NextResponse.json({ error: 'Period lock not found' }, { status: 404 });
		}

		// Delete period lock
		const { error } = await supabase
			.from('period_locks')
			.delete()
			.eq('id', id);

		if (error) {
			console.error('Error deleting period lock:', error);
			return NextResponse.json({ error: 'Failed to unlock period' }, { status: 500 });
		}

		// Log to audit trail
		await supabase.from('audit_log').insert({
			org_id: membership.org_id,
			user_id: user.id,
			action: 'unlock_period',
			entity_type: 'period_lock',
			entity_id: id,
			details: {
				period_start: lock.period_start,
				period_end: lock.period_end,
			},
		});

		return NextResponse.json({ message: 'Period unlocked successfully' });
	} catch (error) {
		console.error('Error in DELETE /api/approvals/period-locks/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

