import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { expense_ids } = await request.json();

		if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
			return NextResponse.json(
				{ error: 'expense_ids array is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const { data, error } = await supabase
			.from('expenses')
			.update({
				status: 'approved',
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.in('id', expense_ids)
			.eq('org_id', membership.org_id)
			.select();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, approved_count: data?.length || 0 });
	} catch (error) {
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

