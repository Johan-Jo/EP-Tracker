import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

// POST /api/worksites/checkout - Record check-out for the latest open session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, user_id, check_out_ts, source } = body;

    if (!project_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify project and org membership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, worksite_enabled, org_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.worksite_enabled) {
      return NextResponse.json({ error: 'Worksite not enabled for this project' }, { status: 403 });
    }

    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user_id)
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Find the latest open session for this user and project
    const { data: openSession } = await supabase
      .from('attendance_session')
      .select('id, org_id, project_id, person_id, check_in_ts')
      .eq('org_id', project.org_id)
      .eq('project_id', project_id)
      .eq('person_id', user_id)
      .is('check_out_ts', null)
      .order('check_in_ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!openSession) {
      // Idempotent success if nothing to close
      return NextResponse.json({ success: true, already_closed: true }, { status: 200 });
    }

    const outIso = check_out_ts || new Date().toISOString();
    const newHash = createHash('sha256').update(
      JSON.stringify({
        org_id: openSession.org_id,
        project_id: openSession.project_id,
        person_id: openSession.person_id,
        check_in_ts: openSession.check_in_ts,
        check_out_ts: outIso,
      })
    ).digest('hex');

    const { error: updateError } = await supabase
      .from('attendance_session')
      .update({ check_out_ts: outIso, immutable_hash: newHash })
      .eq('id', openSession.id);

    if (updateError) {
      console.error('Error closing attendance_session:', updateError);
      return NextResponse.json({ error: 'Failed to record check-out' }, { status: 500 });
    }

    // Log check-out event (best-effort)
    await supabase
      .from('audit_log')
      .insert({
        org_id: project.org_id,
        user_id,
        action: 'worksite_checkout',
        entity_type: 'attendance_session',
        entity_id: openSession.id,
        new_data: {
          project_id,
          check_out_ts: outIso,
          source: source || 'qr_scan',
        },
      });

    return NextResponse.json({ success: true, session_id: openSession.id, check_out_ts: outIso }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/worksites/checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}






