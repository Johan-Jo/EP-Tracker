/**
 * API endpoint to get and update project alert settings (work_day_start, work_day_end)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Check if user has access to this project
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can view project settings' },
        { status: 403 }
      );
    }

    // Get project with alert_settings
    const adminClient = createAdminClient();
    const { data: project, error } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('[Project Settings] Error fetching project:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const alertSettings = (project.alert_settings as any) || {};
    
    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      workDayStart: alertSettings.work_day_start || '07:00',
      workDayEnd: alertSettings.work_day_end || '16:00',
      checkoutReminderMinutesBefore: alertSettings.checkout_reminder_minutes_before || 15,
      forgottenCheckoutMinutesAfter: alertSettings.forgotten_checkout_minutes_after || 30,
    });
  } catch (error: any) {
    console.error('[Project Settings] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, workDayStart, workDayEnd, checkoutReminderMinutesBefore, forgottenCheckoutMinutesAfter } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!workDayStart || !workDayEnd) {
      return NextResponse.json(
        { error: 'workDayStart and workDayEnd are required' },
        { status: 400 }
      );
    }

    if (checkoutReminderMinutesBefore !== undefined && (checkoutReminderMinutesBefore < 1 || checkoutReminderMinutesBefore > 120)) {
      return NextResponse.json(
        { error: 'checkoutReminderMinutesBefore must be between 1 and 120' },
        { status: 400 }
      );
    }

    if (forgottenCheckoutMinutesAfter !== undefined && (forgottenCheckoutMinutesAfter < 1 || forgottenCheckoutMinutesAfter > 120)) {
      return NextResponse.json(
        { error: 'forgottenCheckoutMinutesAfter must be between 1 and 120' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(workDayStart) || !timeRegex.test(workDayEnd)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM (e.g., 07:00)' },
        { status: 400 }
      );
    }

    // Check if user has access to this project
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can update project settings' },
        { status: 403 }
      );
    }

    // Get current project settings
    const adminClient = createAdminClient();
    const { data: project, error: fetchError } = await adminClient
      .from('projects')
      .select('alert_settings')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      console.error('[Project Settings] Error fetching project:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update alert_settings
    const currentSettings = (project.alert_settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      work_day_start: workDayStart,
      work_day_end: workDayEnd,
      ...(checkoutReminderMinutesBefore !== undefined && {
        checkout_reminder_minutes_before: checkoutReminderMinutesBefore,
      }),
      ...(forgottenCheckoutMinutesAfter !== undefined && {
        forgotten_checkout_minutes_after: forgottenCheckoutMinutesAfter,
      }),
    };

    const { error: updateError } = await adminClient
      .from('projects')
      .update({ alert_settings: updatedSettings })
      .eq('id', projectId);

    if (updateError) {
      console.error('[Project Settings] Error updating project:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project settings updated',
      workDayStart,
      workDayEnd,
      checkoutReminderMinutesBefore: checkoutReminderMinutesBefore || currentSettings.checkout_reminder_minutes_before || 15,
      forgottenCheckoutMinutesAfter: forgottenCheckoutMinutesAfter || currentSettings.forgotten_checkout_minutes_after || 30,
    });
  } catch (error: any) {
    console.error('[Project Settings] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

