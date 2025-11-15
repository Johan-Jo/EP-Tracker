/**
 * Cron Job: Check-out Reminders
 * Runs daily at 16:45 to remind workers to check out
 * Schedule: "45 16 * * 1-5" (Mon-Fri at 16:45)
 */

import { createClient } from '@/lib/supabase/server';
import { sendCheckOutReminder } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // Find all active time entries (no stop_at)
    const { data: entries, error } = await supabase
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
      console.error('[Checkout Reminders] Error fetching entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      console.log('[Checkout Reminders] No active entries found');
      return NextResponse.json({ message: 'No active entries', sent: 0 });
    }

    // Send reminder to each user
    let sentCount = 0;
    let failedCount = 0;

    for (const entry of entries) {
      try {
        const startTime = new Date(entry.start_at);
        const now = new Date();
        const hoursWorked = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const result = await sendCheckOutReminder({
          userId: entry.user_id,
          projectName: Array.isArray(entry.projects) ? entry.projects[0]?.name : entry.projects?.name,
          projectId: entry.project_id,
          checkInTime: entry.start_at,
          hoursWorked,
        });

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('[Checkout Reminders] Error sending to user:', entry.user_id, error);
        failedCount++;
      }
    }

    console.log(`[Checkout Reminders] Sent: ${sentCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      message: 'Check-out reminders sent',
      total: entries.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error: any) {
    console.error('[Checkout Reminders] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

