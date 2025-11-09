import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { createHash } from 'crypto';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const bodySchema = z.object({
  field: z.enum(['check_in_ts', 'check_out_ts']),
  new_value: z.string().datetime(),
  reason: z.string().min(10),
});

type RouteParams = { projectId: string; sessionId: string };

export async function POST(
  request: NextRequest,
  context: RouteContext<RouteParams>
) {
  try {
    const { user, membership } = await getSession();
    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { projectId, sessionId } = await resolveRouteParams(context);

    if (!projectId || !sessionId) {
      return NextResponse.json({ error: 'projectId and sessionId are required' }, { status: 400 });
    }
    const supabase = await createClient();

    // Fetch session and verify org/project
    const { data: session, error: fetchError } = await supabase
      .from('attendance_session')
      .select('id, org_id, project_id, person_id, check_in_ts, check_out_ts, immutable_hash')
      .eq('id', sessionId)
      .eq('project_id', projectId)
      .eq('org_id', membership.org_id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.format() }, { status: 400 });
    }

    const { field, new_value, reason } = parsed.data;

    // Compute new fields
    const updatedCheckIn = field === 'check_in_ts' ? new_value : session.check_in_ts;
    const updatedCheckOut = field === 'check_out_ts' ? new_value : session.check_out_ts;

    // Regenerate hash
    const payload = `${session.person_id}|${session.project_id}|${updatedCheckIn}|${updatedCheckOut ?? ''}|corrected`;
    const newHash = createHash('sha256').update(payload).digest('hex');

    // Update session
    const { data: updated, error: updateError } = await supabase
      .from('attendance_session')
      .update({
        check_in_ts: updatedCheckIn,
        check_out_ts: updatedCheckOut,
        immutable_hash: newHash,
        corrected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log correction
    const { data: log, error: logError } = await supabase
      .from('correction_log')
      .insert({
        org_id: membership.org_id,
        session_id: sessionId,
        field,
        old_value: field === 'check_in_ts' ? session.check_in_ts : session.check_out_ts,
        new_value: new_value,
        reason,
        changed_by: user.id,
      })
      .select('id')
      .single();

    if (logError) {
      // eslint-disable-next-line no-console
      console.error('Failed to log correction', logError);
    }

    return NextResponse.json({ success: true, updated_session: updated, correction_log_id: log?.id }, { status: 200 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('POST /api/worksites/[projectId]/sessions/[sessionId]/correct error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


