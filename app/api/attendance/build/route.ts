import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { buildAttendanceSessions } from '@/lib/jobs/attendance-builder';

/**
 * POST /api/attendance/build
 * 
 * Build attendance_session records from time_entries
 * This is useful when migrating from time_entries to attendance_session-based payroll
 * 
 * Body (optional):
 * - project_id: optional project ID to filter
 * - start_date: optional start date (ISO format)
 * - end_date: optional end date (ISO format)
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can build attendance sessions
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json().catch(() => ({}));
		const { project_id, start_date, end_date } = body;

		const result = await buildAttendanceSessions({
			orgId: membership.org_id, // Always filter by org_id
			projectId: project_id,
			startDate: start_date,
			endDate: end_date,
		});

		return NextResponse.json({
			success: true,
			message: 'Attendance sessions built successfully',
			result: {
				processed: result.processed,
				created: result.created,
				updated: result.updated,
				flagged: result.flagged,
			},
		});
	} catch (error) {
		console.error('Error building attendance sessions:', error);
		return NextResponse.json(
			{
				error: 'Failed to build attendance sessions',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

