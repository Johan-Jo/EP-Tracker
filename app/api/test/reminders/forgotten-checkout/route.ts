import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendForgottenCheckOutAlert } from '@/lib/notifications/project-alerts';

/**
 * Test endpoint for forgotten checkout alerts
 * Requires admin/foreman role
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or foreman
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Foreman required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, projectId, workDayEnd, checkedInSince } = body;

    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'userId and projectId are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userName = profile.full_name || profile.email || 'Användare';

    // Verify project exists and get workDayEnd if not provided
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const alertSettings = project.alert_settings as any;
    const finalWorkDayEnd = workDayEnd || alertSettings?.work_day_end || '16:00';
    const finalCheckedInSince = checkedInSince || new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send forgotten checkout alert
    await sendForgottenCheckOutAlert({
      projectId,
      userId,
      userName,
      workDayEnd: finalWorkDayEnd,
      checkedInSince: finalCheckedInSince,
    });

    return NextResponse.json({
      success: true,
      message: `Glömt utcheckningsvarning skickad för ${userName}`,
      userId,
      projectId,
      workDayEnd: finalWorkDayEnd,
      checkedInSince: finalCheckedInSince,
    });
  } catch (error: any) {
    console.error('[Test Forgotten Checkout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

