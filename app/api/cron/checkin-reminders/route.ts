import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendCheckInReminder } from '@/lib/notifications/project-alerts';

/**
 * Cron job to send check-in reminders
 * Should run every hour (or every 15 minutes for more precision)
 * Checks all projects with checkin_reminder_enabled=true
 * Sends reminders to assigned users X minutes before work_day_start
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
    // Get all projects with check-in reminders enabled
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, org_id, alert_settings')
      .not('alert_settings', 'is', null);

    if (projectsError) {
      console.error('Error fetching projects for check-in reminders:', projectsError);
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No projects found' });
    }

    let totalSent = 0;
    const results: any[] = [];

    for (const project of projects) {
      const alertSettings = project.alert_settings as any;
      
      // Skip if reminders are disabled
      if (!alertSettings?.checkin_reminder_enabled) {
        continue;
      }

      const workDayStart = alertSettings.work_day_start || '07:00';
      const minutesBefore = alertSettings.checkin_reminder_minutes_before || 15;

      // Parse work day start time
      const [startHour, startMinute] = workDayStart.split(':').map(Number);
      const reminderTimeMinutes = startHour * 60 + startMinute - minutesBefore;

      // Check if current time matches reminder time (within 15 minute window)
      // This allows cron to run every 15 minutes and still catch reminders
      const timeDiff = Math.abs(currentTimeMinutes - reminderTimeMinutes);
      if (timeDiff > 15) {
        continue; // Not time for this reminder yet
      }

      // Get all users assigned to this project (workers)
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

      // Get all memberships for this organization (foreman and admin)
      const { data: memberships, error: membershipsError } = await adminClient
        .from('memberships')
        .select('user_id, role')
        .eq('org_id', project.org_id)
        .eq('is_active', true)
        .in('role', ['foreman', 'admin']);

      if (membershipsError) {
        console.error(`Error fetching memberships for project ${project.id}:`, membershipsError);
      }

      // Build list of users who should receive reminders based on role settings
      const usersToRemind: string[] = [];

      // Add workers if enabled
      if (alertSettings.checkin_reminder_for_workers !== false && assignments) {
        usersToRemind.push(...assignments.map(a => a.user_id));
      }

      // Add foreman if enabled
      if (alertSettings.checkin_reminder_for_foreman !== false && memberships) {
        const foremanIds = memberships
          .filter(m => m.role === 'foreman')
          .map(m => m.user_id);
        usersToRemind.push(...foremanIds);
      }

      // Add admin if enabled
      if (alertSettings.checkin_reminder_for_admin !== false && memberships) {
        const adminIds = memberships
          .filter(m => m.role === 'admin')
          .map(m => m.user_id);
        usersToRemind.push(...adminIds);
      }

      // Remove duplicates
      const uniqueUserIds = Array.from(new Set(usersToRemind));

      if (uniqueUserIds.length === 0) {
        continue;
      }

      // Fetch profiles for all users
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', uniqueUserIds);

      const profilesMap = new Map(
        (profiles || []).map(p => [p.id, p])
      );

      // Check if users are already checked in today (don't remind if already checked in)
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: checkedInUsers } = await adminClient
        .from('time_entries')
        .select('user_id')
        .eq('project_id', project.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString())
        .is('stop_at', null);

      const checkedInUserIds = new Set((checkedInUsers || []).map(e => e.user_id));

      // Send reminders to users who aren't checked in yet
      for (const userId of uniqueUserIds) {
        // Skip if already checked in
        if (checkedInUserIds.has(userId)) {
          continue;
        }

        const profile = profilesMap.get(userId);
        const userName = profile?.full_name || profile?.email || 'Användare';

        try {
          await sendCheckInReminder({
            projectId: project.id,
            userId,
            userName,
            workDayStart,
          });
          totalSent++;
          results.push({ projectId: project.id, userId, success: true });
        } catch (error) {
          console.error(`Error sending check-in reminder to user ${userId}:`, error);
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
    console.error('Error in check-in reminders cron:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

