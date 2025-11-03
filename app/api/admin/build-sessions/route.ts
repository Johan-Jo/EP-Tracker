import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { buildAttendanceSessions } from '@/lib/jobs/attendance-builder';

export async function POST(request: NextRequest) {
  try {
    const { user, membership } = await getSession();
    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { projectId, startDate, endDate } = body || {};

    const result = await buildAttendanceSessions({ projectId, startDate, endDate });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in POST /api/admin/build-sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


