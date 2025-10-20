import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can reject
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

		// Update all entries to rejected
		const { data, error } = await supabase
			.from('time_entries')
			.update({
				status: 'rejected',
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.in('id', entry_ids)
			.eq('org_id', membership.org_id)
			.select();

		if (error) {
			console.error('Error rejecting time entries:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ 
			success: true, 
			rejected_count: data?.length || 0 
		});
	} catch (error) {
		console.error('Rejection error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

