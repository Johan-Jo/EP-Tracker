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
  // Use console.error for better visibility in Vercel logs
  console.error('[Forgotten Checkout Alerts Cron] ===== CRON JOB TRIGGERED =====');
  console.error('[Forgotten Checkout Alerts Cron] Request received at', new Date().toISOString());
  
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  console.error('[Forgotten Checkout Alerts Cron] Auth header present:', !!authHeader);
  console.error('[Forgotten Checkout Alerts Cron] CRON_SECRET configured:', !!cronSecret);
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Forgotten Checkout Alerts Cron] ❌ Unauthorized - Auth header mismatch');
    console.error('[Forgotten Checkout Alerts Cron] Expected:', cronSecret ? `Bearer ${cronSecret.substring(0, 10)}...` : 'none');
    console.error('[Forgotten Checkout Alerts Cron] Received:', authHeader ? authHeader.substring(0, 20) + '...' : 'none');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.error('[Forgotten Checkout Alerts Cron] ✅ Authorization verified');

  const adminClient = createAdminClient();
  const now = new Date();
  
  // Get time in both UTC and Swedish time
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcTimeMinutes = utcHour * 60 + utcMinute;
  
  // Swedish time (Europe/Stockholm)
  const swedishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  const swedishHour = swedishTime.getHours();
  const swedishMinute = swedishTime.getMinutes();
  const swedishTimeMinutes = swedishHour * 60 + swedishMinute;

  console.error('[Forgotten Checkout Alerts Cron] Starting at', now.toISOString());
  console.error('[Forgotten Checkout Alerts Cron] Current time (UTC):', `${utcHour.toString().padStart(2, '0')}:${utcMinute.toString().padStart(2, '0')} (${utcTimeMinutes} minutes)`);
  console.error('[Forgotten Checkout Alerts Cron] Current time (Swedish):', `${swedishHour.toString().padStart(2, '0')}:${swedishMinute.toString().padStart(2, '0')} (${swedishTimeMinutes} minutes)`);

  try {
    // Get all projects with forgotten check-out alerts enabled
    console.error('[Forgotten Checkout Alerts Cron] Fetching projects...');
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .not('alert_settings', 'is', null);

    if (projectsError) {
      console.error('[Forgotten Checkout Alerts Cron] ❌ Error fetching projects:', JSON.stringify(projectsError, null, 2));
      return NextResponse.json({ 
        error: projectsError.message,
        details: projectsError 
      }, { status: 500 });
    }

    console.error(`[Forgotten Checkout Alerts Cron] Found ${projects?.length || 0} projects with alert_settings`);
    
    if (projects && projects.length > 0) {
      console.error('[Forgotten Checkout Alerts Cron] Project names:', projects.map(p => p.name).join(', '));
    }

    if (!projects || projects.length === 0) {
      console.error('[Forgotten Checkout Alerts Cron] ⚠️ No projects found with alert_settings');
      return NextResponse.json({ 
        sent: 0, 
        message: 'No projects found',
        debug: {
          currentTime: now.toISOString(),
          swedishTime: `${swedishHour.toString().padStart(2, '0')}:${swedishMinute.toString().padStart(2, '0')}`,
        }
      });
    }

    let totalSent = 0;
    const results: any[] = [];
    let checkedProjects = 0;
    let skippedDisabled = 0;
    let skippedTimeWindow = 0;
    let skippedNoActiveEntries = 0;

    // Use Swedish time for calculations (work day times are in Swedish time)
    const currentTimeMinutes = swedishTimeMinutes;

    for (const project of projects) {
      checkedProjects++;
      const alertSettings = project.alert_settings as any;
      
      console.error(`[Forgotten Checkout Alerts Cron] Checking project ${project.name} (${project.id})`);
      console.error(`[Forgotten Checkout Alerts Cron] Alert settings:`, JSON.stringify(alertSettings, null, 2));
      
      // Skip if alerts are disabled
      if (!alertSettings?.forgotten_checkout_enabled) {
        skippedDisabled++;
        console.error(`[Forgotten Checkout Alerts Cron] ⏭️  Skipping ${project.name}: forgotten_checkout_enabled is false or missing`);
        console.error(`[Forgotten Checkout Alerts Cron]   alertSettings.forgotten_checkout_enabled = ${alertSettings?.forgotten_checkout_enabled}`);
        continue;
      }

      const workDayEnd = alertSettings.work_day_end || '16:00';
      const minutesAfter = alertSettings.forgotten_checkout_minutes_after || 30;

      console.error(`[Forgotten Checkout Alerts Cron] Project ${project.name}: work_day_end=${workDayEnd}, minutes_after=${minutesAfter}`);

      // Parse work day end time (in Swedish time)
      const [endHour, endMinute] = workDayEnd.split(':').map(Number);
      const alertTimeMinutes = endHour * 60 + endMinute + minutesAfter;
      const alertTime = `${Math.floor(alertTimeMinutes / 60).toString().padStart(2, '0')}:${(alertTimeMinutes % 60).toString().padStart(2, '0')}`;

      console.error(`[Forgotten Checkout Alerts Cron] Project ${project.name}: Alert should trigger at ${alertTime} (${alertTimeMinutes} minutes)`);

      // Check if current time is past the alert time (within 60 minute window)
      // We use 60 minutes to ensure we catch alerts even if cron is slightly delayed
      // Alert should trigger if: currentTime >= alertTime AND currentTime <= alertTime + 60 minutes
      const timeDiff = currentTimeMinutes - alertTimeMinutes;
      console.error(`[Forgotten Checkout Alerts Cron] Project ${project.name}: Time diff = ${timeDiff} minutes (current: ${currentTimeMinutes}, alert: ${alertTimeMinutes})`);
      
      if (timeDiff < 0) {
        skippedTimeWindow++;
        console.error(`[Forgotten Checkout Alerts Cron] ⏭️  Skipping ${project.name}: Alert time not reached yet (diff: ${timeDiff} minutes, need >= 0)`);
        continue; // Not time for this alert yet
      }
      
      if (timeDiff > 60) {
        skippedTimeWindow++;
        console.error(`[Forgotten Checkout Alerts Cron] ⏭️  Skipping ${project.name}: Too late (diff: ${timeDiff} minutes, max 60)`);
        continue; // Too late, alert was already sent or user checked out
      }
      
      console.error(`[Forgotten Checkout Alerts Cron] ✅ ${project.name} is within time window! (${timeDiff} minutes after alert time)`);
      console.error(`[Forgotten Checkout Alerts Cron] ✅ ${project.name} is within time window! Checking for active entries...`);

      // Get all users who are still checked in on this project
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      console.error(`[Forgotten Checkout Alerts Cron] Fetching active entries for ${project.name} between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);

      const { data: activeEntries, error: entriesError } = await adminClient
        .from('time_entries')
        .select('user_id, start_at')
        .eq('project_id', project.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString())
        .is('stop_at', null);

      if (entriesError) {
        console.error(`[Forgotten Checkout Alerts Cron] ❌ Error fetching active entries for project ${project.id}:`, entriesError);
        continue;
      }

      console.error(`[Forgotten Checkout Alerts Cron] Found ${activeEntries?.length || 0} active entries for ${project.name}`);

      if (!activeEntries || activeEntries.length === 0) {
        skippedNoActiveEntries++;
        console.error(`[Forgotten Checkout Alerts Cron] ⏭️  No active entries for ${project.name}, skipping`);
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

        console.error(`[Forgotten Checkout Alerts Cron] 📧 Sending alert for user ${userName} (${userId}) on project ${project.name}`);
        console.error(`[Forgotten Checkout Alerts Cron]   Checked in since: ${checkedInSince}, Work day end: ${workDayEnd}`);

        try {
          console.error(`[Forgotten Checkout Alerts Cron] 🔄 Calling sendForgottenCheckOutAlert...`);
          const result = await sendForgottenCheckOutAlert({
            projectId: project.id,
            userId,
            userName,
            workDayEnd,
            checkedInSince,
          });
          console.error(`[Forgotten Checkout Alerts Cron] sendForgottenCheckOutAlert returned:`, result);
          totalSent++;
          results.push({ projectId: project.id, userId, success: true });
          console.error(`[Forgotten Checkout Alerts Cron] ✅ Successfully sent alert to ${userName}`);
        } catch (error: any) {
          console.error(`[Forgotten Checkout Alerts Cron] ❌ Error sending alert for user ${userId}:`, error);
          console.error(`[Forgotten Checkout Alerts Cron] Error stack:`, error?.stack);
          console.error(`[Forgotten Checkout Alerts Cron] Error message:`, error?.message);
          results.push({ 
            projectId: project.id, 
            userId, 
            success: false, 
            error: error?.message || String(error),
            stack: error?.stack 
          });
        }
      }
    }

    console.error(`[Forgotten Checkout Alerts Cron] ===== SUMMARY =====`);
    console.error(`[Forgotten Checkout Alerts Cron] Total projects checked: ${checkedProjects}`);
    console.error(`[Forgotten Checkout Alerts Cron] Skipped (disabled): ${skippedDisabled}`);
    console.error(`[Forgotten Checkout Alerts Cron] Skipped (time window): ${skippedTimeWindow}`);
    console.error(`[Forgotten Checkout Alerts Cron] Skipped (no active entries): ${skippedNoActiveEntries}`);
    console.error(`[Forgotten Checkout Alerts Cron] Alerts sent: ${totalSent}`);
    console.error(`[Forgotten Checkout Alerts Cron] Current time (Swedish): ${swedishHour.toString().padStart(2, '0')}:${swedishMinute.toString().padStart(2, '0')}`);
    console.error(`[Forgotten Checkout Alerts Cron] ===================`);

    return NextResponse.json({ 
      sent: totalSent, 
      checked: projects.length,
      skippedDisabled,
      skippedTimeWindow,
      skippedNoActiveEntries,
      currentTime: {
        utc: now.toISOString(),
        swedish: `${swedishHour.toString().padStart(2, '0')}:${swedishMinute.toString().padStart(2, '0')}`,
      },
      results 
    });
  } catch (error) {
    console.error('Error in forgotten check-out alerts cron:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

