import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/payroll/basis/debug
 * 
 * Debug endpoint to check what data exists for payroll calculation
 * Helps diagnose why no payroll basis is found
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can debug
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');

		if (!periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'start and end parameters are required (YYYY-MM-DD)' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Check attendance_session
		const { data: attendanceSessions, error: attendanceError } = await supabase
			.from('attendance_session')
			.select('id, person_id, check_in_ts, check_out_ts, org_id')
			.eq('org_id', membership.org_id)
			.gte('check_in_ts', `${periodStart}T00:00:00Z`)
			.lte('check_in_ts', `${periodEnd}T23:59:59Z`);

		// Check completed attendance_session
		const { data: completedSessions } = await supabase
			.from('attendance_session')
			.select('id, person_id, check_in_ts, check_out_ts')
			.eq('org_id', membership.org_id)
			.gte('check_in_ts', `${periodStart}T00:00:00Z`)
			.lte('check_in_ts', `${periodEnd}T23:59:59Z`)
			.not('check_out_ts', 'is', null);

		// Check time_entries
		const { data: timeEntries, error: timeEntriesError } = await supabase
			.from('time_entries')
			.select('id, user_id, start_at, stop_at, status, org_id')
			.eq('org_id', membership.org_id)
			.gte('start_at', `${periodStart}T00:00:00Z`)
			.lte('start_at', `${periodEnd}T23:59:59Z`);

		// Check approved time_entries
		const { data: approvedEntries } = await supabase
			.from('time_entries')
			.select('id, user_id, start_at, stop_at')
			.eq('org_id', membership.org_id)
			.eq('status', 'approved')
			.gte('start_at', `${periodStart}T00:00:00Z`)
			.lte('start_at', `${periodEnd}T23:59:59Z`)
			.not('stop_at', 'is', null);

		// Get all members for reference
		const { data: members } = await supabase
			.from('memberships')
			.select('user_id, role')
			.eq('org_id', membership.org_id)
			.eq('is_active', true);

		return NextResponse.json({
			period: { start: periodStart, end: periodEnd },
			org_id: membership.org_id,
			attendance_sessions: {
				total: attendanceSessions?.length || 0,
				completed: completedSessions?.length || 0,
				error: attendanceError?.message,
				sample: attendanceSessions?.slice(0, 3) || [],
			},
			time_entries: {
				total: timeEntries?.length || 0,
				approved_completed: approvedEntries?.length || 0,
				error: timeEntriesError?.message,
				sample: timeEntries?.slice(0, 3) || [],
			},
			members: {
				total: members?.length || 0,
				list: members || [],
			},
			recommendations: {
				use_attendance: (completedSessions?.length || 0) > 0,
				use_time_entries: (approvedEntries?.length || 0) > 0,
				message: (completedSessions?.length || 0) === 0 && (approvedEntries?.length || 0) === 0
					? 'Ingen data hittades. Kontrollera att det finns närvaroregistreringar (attendance_session) eller godkända tidsregistreringar (time_entries) för denna period.'
					: 'Data finns. Försök beräkna löneunderlag igen.',
			},
		});
	} catch (error) {
		console.error('Error in GET /api/payroll/basis/debug:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

