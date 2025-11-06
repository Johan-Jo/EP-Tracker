import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendForgottenCheckOutAlert } from '@/lib/notifications/project-alerts';

/**
 * Cron job to send forgotten check-out alerts to admin/foreman
 * Should run every 15 minutes
 * Checks all projects with forgotten_checkout_alert_enabled=true
 * Alerts if users are still checked in X minutes after work_day_end
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
    // Get all projects with forgotten check-out alerts enabled
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .not('alert_settings', 'is', null);

    if (projectsError) {
      console.error('Error fetching projects for forgotten check-out alerts:', projectsError);
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
      if (!alertSettings?.forgotten_checkout_enabled) {
        continue;
      }

      const workDayEnd = alertSettings.work_day_end || '16:00';
      const minutesAfter = alertSettings.forgotten_checkout_minutes_after || 30;

      // Parse work day end time
      const [endHour, endMinute] = workDayEnd.split(':').map(Number);
      const alertTimeMinutes = endHour * 60 + endMinute + minutesAfter;

      // Check if current time is past the alert time (within 15 minute window)
      const timeDiff = currentTimeMinutes - alertTimeMinutes;
      if (timeDiff < 0 || timeDiff > 15) {
        continue; // Not time for this alert yet, or too late
      }

      // Get all users who are still checked in on this project
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: activeEntries, error: entriesError } = await adminClient
        .from('time_entries')
        .select('user_id, start_at')
        .eq('project_id', project.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString())
        .is('stop_at', null);

      if (entriesError) {
        console.error(`Error fetching active entries for project ${project.id}:`, entriesError);
        continue;
      }

      if (!activeEntries || activeEntries.length === 0) {
        continue;
      }

      // Fetch profiles for checked-in users
      const userIds = activeEntries.map(e => e.user_id);
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(
        (profiles || []).map(p => [p.id, p])
      );

      // Send alerts for each user who forgot to check out
      for (const entry of activeEntries) {
        const userId = entry.user_id;
        const profile = profilesMap.get(userId);
        const userName = profile?.full_name || profile?.email || 'Användare';

        // Format check-in time
        const checkInTime = new Date(entry.start_at);
        const checkedInSince = checkInTime.toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit',
        });

        try {
          await sendForgottenCheckOutAlert({
            projectId: project.id,
            userId,
            userName,
            workDayEnd,
            checkedInSince,
          });
          totalSent++;
          results.push({ projectId: project.id, userId, success: true });
        } catch (error) {
          console.error(`Error sending forgotten check-out alert for user ${userId}:`, error);
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
    console.error('Error in forgotten check-out alerts cron:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

