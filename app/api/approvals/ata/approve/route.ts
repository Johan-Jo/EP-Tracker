import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { refreshInvoiceBasisForApprovals } from '@/lib/jobs/refresh-invoice-basis-for-approvals';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan godkänna ÄTA' },
				{ status: 403 }
			);
		}

		const { ata_ids } = await request.json();

		if (!ata_ids || !Array.isArray(ata_ids) || ata_ids.length === 0) {
			return NextResponse.json(
				{ error: 'Välj minst en ÄTA att godkänna' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const { data, error } = await supabase
			.from('ata')
			.update({
				status: 'approved',
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.in('id', ata_ids)
			.eq('org_id', membership.org_id)
			.select('project_id, created_at');

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Refresh invoice basis for all affected projects and periods (fire-and-forget)
		if (data && data.length > 0) {
			refreshInvoiceBasisForApprovals(
				supabase,
				membership.org_id,
				data.map((ata: any) => ({
					project_id: ata.project_id,
					date: ata.created_at,
				}))
			).catch((error) => {
				console.error('[approve-ata] Failed to refresh invoice basis:', error);
			});
		}

		return NextResponse.json({ success: true, approved_count: data?.length || 0 });
	} catch (error) {
		console.error('Approval error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

