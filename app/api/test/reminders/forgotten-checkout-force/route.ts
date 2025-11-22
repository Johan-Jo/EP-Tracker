import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendForgottenCheckOutAlert } from '@/lib/notifications/project-alerts';

/**
 * Force test endpoint for forgotten checkout alerts
 * Ignores time window and sends alerts for any active time entries
 * Requires admin/foreman role
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const now = new Date();
    
    console.error('[Force Test Forgotten Checkout] ===== STARTING =====');
    console.error('[Force Test Forgotten Checkout] Time:', now.toISOString());

    // Get all projects with forgotten check-out alerts enabled
    console.error('[Force Test Forgotten Checkout] Fetching projects...');
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('id, name, alert_settings')
      .not('alert_settings', 'is', null);

    if (projectsError) {
      console.error('[Force Test Forgotten Checkout] ❌ Error fetching projects:', projectsError);
      return NextResponse.json({ 
        error: projectsError.message,
        details: projectsError 
      }, { status: 500 });
    }

    console.error(`[Force Test Forgotten Checkout] Found ${projects?.length || 0} projects with alert_settings`);

    if (!projects || projects.length === 0) {
      return NextResponse.json({ 
        sent: 0, 
        message: 'No projects found',
        projects: []
      });
    }

    let totalSent = 0;
    const results: any[] = [];

    for (const project of projects) {
      const alertSettings = project.alert_settings as any;
      
      console.error(`[Force Test Forgotten Checkout] Checking project ${project.name} (${project.id})`);
      console.error(`[Force Test Forgotten Checkout] Alert settings:`, JSON.stringify(alertSettings, null, 2));
      
      // Skip if alerts are disabled
      if (!alertSettings?.forgotten_checkout_enabled) {
        console.error(`[Force Test Forgotten Checkout] ⏭️  Skipping ${project.name}: forgotten_checkout_enabled is false`);
        continue;
      }

      const workDayEnd = alertSettings.work_day_end || '16:00';

      // Get all users who are still checked in on this project (ignore time window)
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      console.error(`[Force Test Forgotten Checkout] Fetching active entries for ${project.name}...`);

      const { data: activeEntries, error: entriesError } = await adminClient
        .from('time_entries')
        .select('user_id, start_at')
        .eq('project_id', project.id)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString())
        .is('stop_at', null);

      if (entriesError) {
        console.error(`[Force Test Forgotten Checkout] ❌ Error fetching active entries:`, entriesError);
        continue;
      }

      console.error(`[Force Test Forgotten Checkout] Found ${activeEntries?.length || 0} active entries for ${project.name}`);

      if (!activeEntries || activeEntries.length === 0) {
        console.error(`[Force Test Forgotten Checkout] ⏭️  No active entries for ${project.name}`);
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

        console.error(`[Force Test Forgotten Checkout] 📧 Sending alert for user ${userName} (${userId}) on project ${project.name}`);

        try {
          const result = await sendForgottenCheckOutAlert({
            projectId: project.id,
            userId,
            userName,
            workDayEnd,
            checkedInSince,
          });
          totalSent++;
          results.push({ 
            projectId: project.id, 
            projectName: project.name,
            userId, 
            userName,
            success: true,
            result 
          });
          console.error(`[Force Test Forgotten Checkout] ✅ Successfully sent alert to ${userName}`);
        } catch (error: any) {
          console.error(`[Force Test Forgotten Checkout] ❌ Error sending alert:`, error);
          results.push({ 
            projectId: project.id, 
            projectName: project.name,
            userId, 
            userName,
            success: false, 
            error: error?.message || String(error) 
          });
        }
      }
    }

    console.error(`[Force Test Forgotten Checkout] ===== SUMMARY =====`);
    console.error(`[Force Test Forgotten Checkout] Alerts sent: ${totalSent}`);
    console.error(`[Force Test Forgotten Checkout] ===================`);

    return NextResponse.json({ 
      success: true,
      sent: totalSent, 
      checked: projects.length,
      results 
    });
  } catch (error: any) {
    console.error('[Force Test Forgotten Checkout] ❌ Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error?.stack 
    }, { status: 500 });
  }
}

