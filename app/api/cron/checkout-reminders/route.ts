/**
 * Cron Job: Check-out Reminders
 * Runs daily at 16:45 to remind workers to check out
 * Schedule: "45 16 * * 1-5" (Mon-Fri at 16:45)
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendCheckOutReminder } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log('[Checkout Reminders Cron] Starting cron job at', new Date().toISOString());
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader) {
      console.error('[Checkout Reminders Cron] No authorization header');
      return NextResponse.json({ error: 'Unauthorized: No authorization header' }, { status: 401 });
    }
    
    if (authHeader !== expectedAuth) {
      console.error('[Checkout Reminders Cron] Invalid authorization header');
      console.log('[Checkout Reminders Cron] Expected:', expectedAuth.substring(0, 20) + '...');
      console.log('[Checkout Reminders Cron] Received:', authHeader.substring(0, 20) + '...');
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    console.log('[Checkout Reminders Cron] Authorization verified');

    // Use admin client to bypass RLS when fetching time entries
    const adminClient = createAdminClient();

    // Find all active time entries (no stop_at)
    console.log('[Checkout Reminders Cron] Fetching active time entries...');
    const { data: entries, error } = await adminClient
      .from('time_entries')
      .select(`
        id,
        user_id,
        project_id,
        start_at,
        projects!inner(id, name)
      `)
      .is('stop_at', null)
      .order('start_at', { ascending: true });

    if (error) {
      console.error('[Checkout Reminders Cron] Error fetching entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Checkout Reminders Cron] Found ${entries?.length || 0} active entries`);

    if (!entries || entries.length === 0) {
      console.log('[Checkout Reminders Cron] No active entries found');
      return NextResponse.json({ 
        message: 'No active entries', 
        total: 0,
        sent: 0,
        failed: 0,
      });
    }

    // Send reminder to each user
    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    for (const entry of entries) {
      try {
        const startTime = new Date(entry.start_at);
        const now = new Date();
        const hoursWorked = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const projectName = Array.isArray(entry.projects) 
          ? entry.projects[0]?.name 
          : entry.projects?.name || 'Okänt projekt';

        console.log(`[Checkout Reminders Cron] Sending reminder to user ${entry.user_id} for project ${projectName} (${hoursWorked.toFixed(2)}h worked)`);

        const result = await sendCheckOutReminder({
          userId: entry.user_id,
          projectName,
          projectId: entry.project_id,
          checkInTime: entry.start_at,
          hoursWorked,
        });

        if (result && result.success) {
          sentCount++;
          results.push({ 
            userId: entry.user_id, 
            projectId: entry.project_id, 
            projectName,
            success: true 
          });
          console.log(`[Checkout Reminders Cron] ✅ Sent reminder to user ${entry.user_id}`);
        } else {
          failedCount++;
          const errorMsg = result?.errors?.join(', ') || 'Unknown error';
          results.push({
            userId: entry.user_id,
            projectId: entry.project_id,
            projectName,
            success: false,
            error: errorMsg,
          });
          console.error(`[Checkout Reminders Cron] ❌ Failed to send to user ${entry.user_id}:`, errorMsg);
        }
      } catch (error: any) {
        console.error(`[Checkout Reminders Cron] ❌ Error sending to user ${entry.user_id}:`, error);
        failedCount++;
        results.push({
          userId: entry.user_id,
          projectId: entry.project_id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Checkout Reminders Cron] Completed in ${duration}ms. Sent: ${sentCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      message: 'Check-out reminders sent',
      total: entries.length,
      sent: sentCount,
      failed: failedCount,
      results,
      duration_ms: duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Checkout Reminders Cron] Unexpected error:', error);
    console.error('[Checkout Reminders Cron] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}

