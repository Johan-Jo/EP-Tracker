/**
 * Project Alert Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(
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

    const { data, error } = await supabase
      .from('projects')
      .select('alert_settings')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert_settings: data?.alert_settings || {} });
  } catch (error: any) {
    console.error('[Alert Settings GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, membership } = await getSession();

    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and foreman can update alert settings
    if (membership.role !== 'admin' && membership.role !== 'foreman') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alert_settings } = await request.json();

    if (!alert_settings) {
      return NextResponse.json(
        { error: 'alert_settings is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('projects')
      .update({ alert_settings })
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data });
  } catch (error: any) {
    console.error('[Alert Settings PUT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

