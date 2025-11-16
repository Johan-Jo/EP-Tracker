import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { approveTimeEntries } from '@/lib/approvals/approve-time-entries';
import { refreshInvoiceBasisForApprovals } from '@/lib/jobs/refresh-invoice-basis-for-approvals';

/**
 * POST /api/invoice/approve
 * 
 * Unified approve/deny API for all entry types.
 * Supports: time, material, expense, mileage, ata
 * 
 * Input: { type: 'time' | 'material' | 'expense' | 'mileage' | 'ata', ids: string[], action: 'approve' | 'deny' }
 */
export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Only admin and foreman can approve/deny
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan godkänna poster' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { type, ids, action } = body;

		if (!type || !['time', 'material', 'expense', 'mileage', 'ata'].includes(type)) {
			return NextResponse.json(
				{ error: 'Ogiltig typ. Måste vara: time, material, expense, mileage, eller ata' },
				{ status: 400 }
			);
		}

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return NextResponse.json(
				{ error: 'ids måste vara en array med minst ett id' },
				{ status: 400 }
			);
		}

		if (!action || !['approve', 'deny'].includes(action)) {
			return NextResponse.json(
				{ error: 'action måste vara "approve" eller "deny"' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		const newStatus = action === 'approve' ? 'approved' : 'rejected';
		const updateData: Record<string, unknown> = {
			status: newStatus,
			approved_by: user.id,
			approved_at: action === 'approve' ? new Date().toISOString() : null,
		};

		let tableName: string;
		let dateField: string;
		let projectIdField = 'project_id';

		switch (type) {
			case 'time':
				if (action === 'approve') {
					// Use special approve function for time entries
					const { entries } = await approveTimeEntries({
						supabase,
						entryIds: ids,
						approverId: user.id,
						orgId: membership.org_id,
					});
					if (entries.length > 0) {
						refreshInvoiceBasisForApprovals(
							supabase,
							membership.org_id,
							entries.map((entry: any) => ({
								project_id: entry.project_id,
								date: entry.start_at,
							}))
						).catch((error: unknown) => {
							console.error('[invoice/approve] Failed to refresh invoice basis:', error);
						});
					}
					return NextResponse.json({ success: true, count: entries.length, action, type });
				} else {
					// For deny/reject, update status directly
					tableName = 'time_entries';
					dateField = 'start_at';
					break;
				}
			case 'material':
				tableName = 'materials';
				dateField = 'created_at';
				break;
			case 'expense':
				tableName = 'expenses';
				dateField = 'created_at';
				break;
			case 'mileage':
				tableName = 'mileage';
				dateField = 'date';
				break;
			case 'ata':
				tableName = 'ata';
				dateField = 'created_at';
				break;
			default:
				return NextResponse.json({ error: 'Ogiltig typ' }, { status: 400 });
		}

		// Update entries
		const { data, error } = await supabase
			.from(tableName)
			.update(updateData)
			.in('id', ids)
			.eq('org_id', membership.org_id)
			.select(`${projectIdField}, ${dateField}`);

		if (error) {
			console.error(`[invoice/approve] Error updating ${type}:`, error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Refresh invoice basis for affected projects (fire-and-forget)
		if (action === 'approve' && data && data.length > 0) {
			refreshInvoiceBasisForApprovals(
				supabase,
				membership.org_id,
				data.map((item: any) => ({
					project_id: item[projectIdField],
					date: item[dateField],
				}))
			).catch((error: unknown) => {
				console.error(`[invoice/approve] Failed to refresh invoice basis for ${type}:`, error);
			});
		}

		return NextResponse.json({
			success: true,
			count: data?.length || 0,
			action,
			type,
		});
	} catch (error) {
		console.error('Invoice approve error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

