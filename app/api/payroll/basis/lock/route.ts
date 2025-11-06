import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * POST /api/payroll/basis/lock
 * 
 * Lock or unlock payroll basis records
 * 
 * Body:
 * - entry_ids: array of payroll_basis IDs to lock/unlock
 * - lock: boolean (true to lock, false to unlock)
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can lock/unlock payroll basis
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { entry_ids, lock } = body;

		if (!Array.isArray(entry_ids) || entry_ids.length === 0) {
			return NextResponse.json(
				{ error: 'entry_ids must be a non-empty array' },
				{ status: 400 }
			);
		}

		if (typeof lock !== 'boolean') {
			return NextResponse.json(
				{ error: 'lock must be a boolean' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Verify all entries belong to the user's organization
		const { data: entries, error: verifyError } = await supabase
			.from('payroll_basis')
			.select('id, org_id, locked')
			.in('id', entry_ids)
			.eq('org_id', membership.org_id);

		if (verifyError) {
			console.error('Error verifying payroll basis entries:', verifyError);
			return NextResponse.json({ error: 'Failed to verify entries' }, { status: 500 });
		}

		if (!entries || entries.length !== entry_ids.length) {
			return NextResponse.json(
				{ error: 'Some entries not found or access denied' },
				{ status: 404 }
			);
		}

		// Update lock status
		const updateData: {
			locked: boolean;
			locked_by: string | null;
			locked_at: string | null;
		} = {
			locked: lock,
			locked_by: lock ? user.id : null,
			locked_at: lock ? new Date().toISOString() : null,
		};

		const { error: updateError } = await supabase
			.from('payroll_basis')
			.update(updateData)
			.in('id', entry_ids)
			.eq('org_id', membership.org_id);

		if (updateError) {
			console.error('Error updating payroll basis lock status:', updateError);
			return NextResponse.json({ error: 'Failed to update lock status' }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: lock ? 'Löneunderlag låst' : 'Löneunderlag upplåst',
			updated_count: entry_ids.length,
		});
	} catch (error) {
		console.error('Error in POST /api/payroll/basis/lock:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

