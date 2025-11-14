import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

function parseDateOnly(input: string | null) {
	if (!input) return null;
	// Accept YYYY-MM-DD or ISO string
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().split('T')[0];
}

function formatDateOnly(date: Date) {
	return date.toISOString().split('T')[0];
}

interface DurationRow {
	duration_min: number | null;
}

async function sumDuration(
	supabase: SupabaseClient,
	filters: {
		orgId: string;
		projectId?: string | null;
		userId?: string | null;
		status?: string | null;
		filterStart?: string | null;
		filterEnd?: string | null;
		rangeStart?: string | null;
		rangeEnd?: string | null;
	},
) {
	let query = supabase
		.from('time_entries')
		.select('duration_min')
		.eq('org_id', filters.orgId);

	if (filters.projectId) query = query.eq('project_id', filters.projectId);
	if (filters.userId) query = query.eq('user_id', filters.userId);
	if (filters.status) query = query.eq('status', filters.status);
	if (filters.filterStart) query = query.gte('start_at', filters.filterStart);
	if (filters.filterEnd) query = query.lte('start_at', filters.filterEnd);
	if (filters.rangeStart) query = query.gte('start_at', filters.rangeStart);
	if (filters.rangeEnd) query = query.lt('start_at', filters.rangeEnd);

	const { data, error } = await query;
	if (error) {
		throw error;
	}
	return ((data ?? []) as DurationRow[]).reduce((total, row) => total + Number(row?.duration_min ?? 0), 0);
}

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('project_id');
		const requestedUserId = searchParams.get('user_id');
		const status = searchParams.get('status');
		const startDateParam = parseDateOnly(searchParams.get('start_date'));
		const endDateParam = parseDateOnly(searchParams.get('end_date'));

		const isWorker = membership.role === 'worker' || membership.role === 'ue';
		const effectiveUserId = requestedUserId && !isWorker ? requestedUserId : isWorker ? user.id : requestedUserId;

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const weekStart = new Date(today);
		const weekday = weekStart.getDay();
		const diff = weekday === 0 ? 6 : weekday - 1; // Monday start
		weekStart.setDate(weekStart.getDate() - diff);

		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		const baseFilters = {
			orgId: membership.org_id,
			projectId,
			userId: effectiveUserId,
			status,
			filterStart: startDateParam,
			filterEnd: endDateParam,
		};

		const [todayTotal, yesterdayTotal, thisWeekTotal, thisMonthTotal] = await Promise.all([
			sumDuration(supabase, {
				...baseFilters,
				rangeStart: formatDateOnly(today),
				rangeEnd: formatDateOnly(tomorrow),
			}),
			sumDuration(supabase, {
				...baseFilters,
				rangeStart: formatDateOnly(yesterday),
				rangeEnd: formatDateOnly(today),
			}),
			sumDuration(supabase, {
				...baseFilters,
				rangeStart: formatDateOnly(weekStart),
			}),
			sumDuration(supabase, {
				...baseFilters,
				rangeStart: formatDateOnly(monthStart),
			}),
		]);

		return NextResponse.json(
			{
				today: todayTotal,
				yesterday: yesterdayTotal,
				thisWeek: thisWeekTotal,
				thisMonth: thisMonthTotal,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error('Error in GET /api/time/entries/stats:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

