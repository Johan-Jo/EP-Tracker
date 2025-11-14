import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';
import { refreshInvoiceBasisForApprovals } from '@/lib/jobs/refresh-invoice-basis-for-approvals';

type RouteParams = { id: string };

export async function POST(
	request: Request,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'ÄTA-id saknas' }, { status: 400 });
		}
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Check user role and get org_id
		const { data: membership } = await supabase
			.from('memberships')
			.select('role, org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership || (membership.role !== 'admin' && membership.role !== 'foreman')) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan godkänna ÄTA' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { action, approved_by_name, comments } = body;

		if (!action || !approved_by_name) {
			return NextResponse.json(
				{ error: 'Action och signatur krävs' },
				{ status: 400 }
			);
		}

		if (action === 'reject' && !comments) {
			return NextResponse.json(
				{ error: 'Kommentarer krävs för avslag' },
				{ status: 400 }
			);
		}

		// Update ÄTA status
		const updateData: Record<string, unknown> = {
			status: action === 'approve' ? 'approved' : 'rejected',
			approved_by: user.id,
			approved_by_name,
			approved_at: new Date().toISOString(),
		};

		if (comments) {
			updateData.comments = comments;
		}

		const { data: ata, error } = await supabase
			.from('ata')
			.update(updateData)
			.eq('id', id)
			.select('project_id, created_at')
			.single();

		if (error) {
			console.error('Error updating ÄTA:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Refresh invoice basis for the affected project and period (fire-and-forget)
		if (action === 'approve' && ata && ata.project_id && ata.created_at) {
			refreshInvoiceBasisForApprovals(
				supabase,
				membership.org_id,
				[{
					project_id: ata.project_id,
					date: ata.created_at,
				}]
			).catch((error) => {
				console.error('[approve-ata] Failed to refresh invoice basis:', error);
			});
		}

		return NextResponse.json({ ata });
	} catch (error) {
		console.error('Approval error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

