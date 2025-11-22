/**
 * Test endpoint for cron check-out reminders
 * Simulates the cron job that sends reminders to all users with active time entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCheckOutReminder } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (for security)
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can test reminders' },
        { status: 403 }
      );
    }

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
      console.error('[Test Cron Checkout] Error fetching entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        message: 'No active entries found',
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
          : entry.projects?.name;

        const result = await sendCheckOutReminder({
          userId: entry.user_id,
          projectName: projectName || 'Okänt projekt',
          projectId: entry.project_id,
          checkInTime: entry.start_at,
          hoursWorked,
        });

        if (result && result.success) {
          sentCount++;
          results.push({ userId: entry.user_id, projectId: entry.project_id, success: true });
        } else {
          failedCount++;
          results.push({
            userId: entry.user_id,
            projectId: entry.project_id,
            success: false,
            error: result?.errors?.join(', ') || 'Unknown error',
          });
        }
      } catch (error: any) {
        console.error('[Test Cron Checkout] Error sending to user:', entry.user_id, error);
        failedCount++;
        results.push({
          userId: entry.user_id,
          projectId: entry.project_id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    console.log(`[Test Cron Checkout] Sent: ${sentCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      message: 'Check-out reminders sent',
      total: entries.length,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error('[Test Cron Checkout] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


