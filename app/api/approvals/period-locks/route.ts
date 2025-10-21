import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { createPeriodLockSchema } from '@/lib/schemas/period-lock';

// GET /api/approvals/period-locks - List period locks
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const { searchParams } = new URL(request.url);
		const includeExpired = searchParams.get('includeExpired') === 'true';

		let query = supabase
			.from('period_locks')
			.select(`
				*,
				locked_by_user:profiles!period_locks_locked_by_fkey(full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('period_start', { ascending: false });

		// By default, only show current/future locks
		if (!includeExpired) {
			const today = new Date().toISOString().split('T')[0];
			query = query.gte('period_end', today);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching period locks:', error);
			return NextResponse.json({ error: 'Failed to fetch period locks' }, { status: 500 });
		}

		return NextResponse.json({ periodLocks: data || [] });
	} catch (error) {
		console.error('Error in GET /api/approvals/period-locks:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/approvals/period-locks - Create period lock
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin can lock periods
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can lock periods' }, { status: 403 });
		}

		const body = await request.json();
		const validatedData = createPeriodLockSchema.parse(body);

		const supabase = await createClient();

		// Check if period is already locked
		const { data: existingLock } = await supabase
			.from('period_locks')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('period_start', validatedData.period_start)
			.eq('period_end', validatedData.period_end)
			.single();

		if (existingLock) {
			return NextResponse.json({ error: 'Period is already locked' }, { status: 400 });
		}

		// Create period lock
		const { data, error } = await supabase
			.from('period_locks')
			.insert({
				org_id: membership.org_id,
				locked_by: user.id,
				period_start: validatedData.period_start,
				period_end: validatedData.period_end,
				reason: validatedData.reason || null,
			})
			.select(`
				*,
				locked_by_user:profiles!period_locks_locked_by_fkey(full_name, email)
			`)
			.single();

		if (error) {
			console.error('Error creating period lock:', error);
			return NextResponse.json({ error: 'Failed to create period lock' }, { status: 500 });
		}

		// Log to audit trail
		await supabase.from('audit_log').insert({
			org_id: membership.org_id,
			user_id: user.id,
			action: 'lock_period',
			entity_type: 'period_lock',
			entity_id: data.id,
			details: {
				period_start: validatedData.period_start,
				period_end: validatedData.period_end,
				reason: validatedData.reason,
			},
		});

		return NextResponse.json({ periodLock: data }, { status: 201 });
	} catch (error) {
		if (error instanceof Error && error.name === 'ZodError') {
			return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 });
		}
		console.error('Error in POST /api/approvals/period-locks:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

