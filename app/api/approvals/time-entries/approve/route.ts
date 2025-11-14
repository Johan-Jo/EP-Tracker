import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { approveTimeEntries } from '@/lib/approvals/approve-time-entries';

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

		const { entries } = await approveTimeEntries({
			supabase,
			entryIds: entry_ids,
			approverId: user.id,
			orgId: membership.org_id,
		});

		return NextResponse.json({ 
			success: true, 
			approved_count: entries.length 
		});
	} catch (error) {
		console.error('Approval error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}
