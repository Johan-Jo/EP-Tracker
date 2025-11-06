import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendLateCheckInAlert } from '@/lib/notifications/project-alerts';

/**
 * Cron job to send late check-in alerts to admin/foreman
 * Should run every 15 minutes
 * Checks all projects with late_checkin_alert_enabled=true
 * Alerts if assigned users haven't checked in X minutes after work_day_start
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  try {
    // Get all projects with late check-in alerts enabled
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .not('alert_settings', 'is', null);

    if (projectsError) {
      console.error('Error fetching projects for late check-in alerts:', projectsError);
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No projects found' });
    }

    let totalSent = 0;
    const results: any[] = [];

    for (const project of projects) {
      const alertSettings = project.alert_settings as any;
      
      // Skip if alerts are disabled
      if (!alertSettings?.late_checkin_enabled) {
        continue;
      }

      const workDayStart = alertSettings.work_day_start || '07:00';
      const minutesAfter = alertSettings.late_checkin_minutes_after || 15;

      // Parse work day start time
      const [startHour, startMinute] = workDayStart.split(':').map(Number);
      const alertTimeMinutes = startHour * 60 + startMinute + minutesAfter;

      // Check if current time is past the alert time (within 15 minute window)
      const timeDiff = currentTimeMinutes - alertTimeMinutes;
      if (timeDiff < 0 || timeDiff > 15) {
        continue; // Not time for this alert yet, or too late
      }

      // Get all users assigned to this project
      const { data: assignments, error: assignmentsError } = await adminClient
        .from('assignments')
        .select('user_id')
        .eq('project_id', project.id)
        .eq('status', 'active')
        .is('end_date', null);

      if (assignmentsError) {
        console.error(`Error fetching assignments for project ${project.id}:`, assignmentsError);
        continue;
      }

      if (!assignments || assignments.length === 0) {
        continue;
      }

      // Check which users have checked in today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: checkedInUsers } = await adminClient
        .from('time_entries')
        .select('user_id')
        .eq('project_id', project.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString());

      const checkedInUserIds = new Set((checkedInUsers || []).map(e => e.user_id));

      // Find users who haven't checked in
      const lateUsers = assignments.filter(a => !checkedInUserIds.has(a.user_id));

      if (lateUsers.length === 0) {
        continue;
      }

      // Fetch profiles for late users
      const userIds = lateUsers.map(u => u.user_id);
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(
        (profiles || []).map(p => [p.id, p])
      );

      // Send alerts for each late user
      for (const user of lateUsers) {
        const userId = user.user_id;
        const profile = profilesMap.get(userId);
        const userName = profile?.full_name || profile?.email || 'Användare';

        try {
          await sendLateCheckInAlert({
            projectId: project.id,
            userId,
            userName,
            workDayStart,
            minutesLate: minutesAfter,
          });
          totalSent++;
          results.push({ projectId: project.id, userId, success: true });
        } catch (error) {
          console.error(`Error sending late check-in alert for user ${userId}:`, error);
          results.push({ projectId: project.id, userId, success: false, error: String(error) });
        }
      }
    }

    return NextResponse.json({ 
      sent: totalSent, 
      checked: projects.length,
      results 
    });
  } catch (error) {
    console.error('Error in late check-in alerts cron:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

