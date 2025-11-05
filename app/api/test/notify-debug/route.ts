import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyOnCheckIn } from '@/lib/notifications/project-alerts';

/**
 * Test endpoint to debug notification flow
 * Returns detailed information about what happens
 */
export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    results: {},
  };

  try {
    const body = await request.json();
    const { projectId, userId } = body;

    if (!projectId || !userId) {
      return NextResponse.json({
        error: 'Missing projectId or userId',
        debugInfo,
      }, { status: 400 });
    }

    debugInfo.steps.push('Request received');
    debugInfo.inputs = { projectId, userId };

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      debugInfo.errors.push('Not authenticated');
      return NextResponse.json({ error: 'Unauthorized', debugInfo }, { status: 401 });
    }

    debugInfo.steps.push('User authenticated');
    debugInfo.currentUser = { id: user.id, email: user.email };

    // Verify caller is admin
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || membership.role !== 'admin') {
      debugInfo.errors.push('Not an admin');
      return NextResponse.json({ error: 'Only admins can test notifications', debugInfo }, { status: 403 });
    }

    debugInfo.steps.push('Admin verified');

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, org_id, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      debugInfo.errors.push(`Project fetch error: ${projectError?.message}`);
      return NextResponse.json({ error: 'Project not found', debugInfo }, { status: 404 });
    }

    debugInfo.steps.push('Project fetched');
    debugInfo.project = {
      name: project.name,
      org_id: project.org_id,
      alert_settings: project.alert_settings,
    };

    const alertSettings = project.alert_settings as any;
    if (!alertSettings?.notify_on_checkin) {
      debugInfo.errors.push('notify_on_checkin is disabled');
      return NextResponse.json({
        error: 'Check-in notifications disabled for this project',
        debugInfo,
      }, { status: 400 });
    }

    debugInfo.steps.push('Notifications enabled');

    // Get recipients
    const rolesToCheck = alertSettings.alert_recipients || ['admin', 'foreman'];
    const { data: recipients, error: recipientsError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .in('role', rolesToCheck);

    if (recipientsError) {
      debugInfo.errors.push(`Recipients fetch error: ${recipientsError.message}`);
      return NextResponse.json({ error: 'Failed to fetch recipients', debugInfo }, { status: 500 });
    }

    debugInfo.steps.push('Recipients fetched');
    debugInfo.recipients = recipients || [];
    debugInfo.rolesChecked = rolesToCheck;

    if (!recipients || recipients.length === 0) {
      debugInfo.errors.push('No recipients found');
      return NextResponse.json({
        error: 'No recipients found',
        debugInfo,
      }, { status: 400 });
    }

    // Get user profile for the check-in user
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    debugInfo.steps.push('User profile fetched');
    debugInfo.checkInUser = {
      id: userId,
      name: profile?.full_name || 'Unknown',
      email: profile?.email || 'Unknown',
    };

    // Call notifyOnCheckIn and capture result
    debugInfo.steps.push('Calling notifyOnCheckIn...');
    
    try {
      const result = await notifyOnCheckIn({
        projectId,
        userId,
        userName: profile?.full_name || profile?.email || 'Test User',
        checkinTime: new Date(),
      });

      debugInfo.steps.push('notifyOnCheckIn completed');
      debugInfo.results.notifyOnCheckIn = result || 'null (function returned undefined)';
    } catch (error: any) {
      debugInfo.errors.push(`notifyOnCheckIn error: ${error.message}`);
      debugInfo.results.notifyOnCheckInError = {
        message: error.message,
        stack: error.stack,
      };
    }

    // Check notification_log table
    const { data: notificationLogs, error: logError } = await supabase
      .from('notification_log')
      .select('*')
      .eq('type', 'team_checkin')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!logError) {
      debugInfo.results.recentNotifications = notificationLogs || [];
    } else {
      debugInfo.errors.push(`Log fetch error: ${logError.message}`);
    }

    // Check email_logs table
    const adminClient = await import('@/lib/supabase/server').then(m => m.createAdminClient());
    const { data: emailLogs, error: emailLogError } = await adminClient
      .from('email_logs')
      .select('*')
      .eq('email_type', 'notification')
      .order('sent_at', { ascending: false })
      .limit(5);

    if (!emailLogError) {
      debugInfo.results.recentEmails = emailLogs || [];
    } else {
      debugInfo.errors.push(`Email log fetch error: ${emailLogError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Test completed',
      debugInfo,
    });

  } catch (error: any) {
    debugInfo.errors.push(`Unexpected error: ${error.message}`);
    debugInfo.errors.push(`Stack: ${error.stack}`);
    return NextResponse.json({
      error: 'Test failed',
      debugInfo,
    }, { status: 500 });
  }
}

