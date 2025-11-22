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
    
    if (!id || id === 'undefined') {
      console.error('[Alert Settings PUT] Missing or invalid project ID:', id);
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    console.log('[Alert Settings PUT] Updating alert settings for project:', id);
    
    const { user, membership } = await getSession();

    if (!user || !membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and foreman can update alert settings
    if (membership.role !== 'admin' && membership.role !== 'foreman') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('[Alert Settings PUT] Request body:', body);
    
    const { alert_settings } = body;

    if (!alert_settings) {
      console.error('[Alert Settings PUT] Missing alert_settings in request body');
      return NextResponse.json(
        { error: 'alert_settings is required' },
        { status: 400 }
      );
    }

    console.log('[Alert Settings PUT] Updating with alert_settings:', alert_settings);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('projects')
      .update({ alert_settings })
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .select()
      .single();

    if (error) {
      console.error('[Alert Settings PUT] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Alert Settings PUT] Successfully updated project:', data?.id);
    return NextResponse.json({ project: data });
  } catch (error: any) {
    console.error('[Alert Settings PUT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

