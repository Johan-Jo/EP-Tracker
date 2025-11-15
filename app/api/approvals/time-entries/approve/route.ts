import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { approveTimeEntries } from '@/lib/approvals/approve-time-entries';
import { refreshInvoiceBasisForApprovals } from '@/lib/jobs/refresh-invoice-basis-for-approvals';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Only admin and foreman can approve
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan godkänna tidrapporter' },
				{ status: 403 }
			);
		}

		const { entry_ids } = await request.json();

		if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
			return NextResponse.json(
				{ error: 'Välj minst en tidrapport att godkänna' },
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

		// Refresh invoice basis for all affected projects and periods (fire-and-forget)
		if (entries.length > 0) {
			refreshInvoiceBasisForApprovals(
				supabase,
				membership.org_id,
				entries.map((entry: any) => ({
					project_id: entry.project_id,
					date: entry.start_at,
				}))
			).catch((error) => {
				console.error('[approve-time-entries] Failed to refresh invoice basis:', error);
			});
		}

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
