import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, membership } = await getSession();
    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Fetch entry and project lock state
    const { data: entry, error: fetchError } = await supabase
      .from('diary_entries')
      .select('id, org_id, project_id')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Diary entry not found' }, { status: 404 });
    }

    let isLocked = false;
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('id, is_locked')
        .eq('id', entry.project_id)
        .eq('org_id', membership.org_id)
        .single();
      isLocked = !!project?.is_locked;
    } catch (e: any) {
      // If column is missing (older DB), treat as unlocked
      if (typeof e?.message === 'string' && e.message.includes('is_locked')) {
        isLocked = false;
      } else {
        throw e;
      }
    }

    if (isLocked) {
      return NextResponse.json({ error: 'Project is locked. Diary entries cannot be modified.' }, { status: 403 });
    }

    // Allow admin/foreman to edit any; workers can edit own-created if desired (optional rule)
    // For simplicity, rely on RLS and organization scoping here.
    const { data: updated, error: updateError } = await supabase
      .from('diary_entries')
      .update({
        weather: body.weather ?? null,
        temperature_c: body.temperature_c ?? null,
        crew_count: body.crew_count ?? null,
        work_performed: body.work_performed ?? null,
        obstacles: body.obstacles ?? null,
        safety_notes: body.safety_notes ?? null,
        deliveries: body.deliveries ?? null,
        visitors: body.visitors ?? null,
        signature_name: body.signature_name ?? null,
        signature_timestamp: body.signature_timestamp ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ diary: updated }, { status: 200 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('PATCH /api/diary/[id] error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, membership } = await getSession();
    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('diary_entries')
      .select(`*`)
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ diary: data }, { status: 200 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('GET /api/diary/[id] error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


