/**
 * Cron Job: Weekly Approval Summary
 * Runs every Monday at 08:00 to notify about pending approvals
 * Schedule: "0 8 * * 1" (Monday at 08:00)
 */

import { createClient } from '@/lib/supabase/server';
import { sendApprovalNeededNotification } from '@/lib/notifications';
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

    // Get current week number
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();

    // Find organizations with pending approvals
    // This is a simplified version - in production, you'd track approval status
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name');

    if (error) {
      console.error('[Weekly Approval] Error fetching orgs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: 'No organizations found' });
    }

    let sentCount = 0;

    for (const org of orgs) {
      try {
        // Count time entries from last week that might need approval
        // This is simplified - you'd have a proper approval tracking system
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        
        const { count } = await supabase
          .from('time_entries')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .gte('start_at', lastWeekStart.toISOString());

        if (count && count > 0) {
          await sendApprovalNeededNotification({
            orgId: org.id,
            count,
            weekNumber: weekNumber - 1, // Last week
            year,
          });
          sentCount++;
        }
      } catch (error) {
        console.error('[Weekly Approval] Error for org:', org.id, error);
      }
    }

    console.log(`[Weekly Approval] Sent notifications to ${sentCount} organizations`);

    return NextResponse.json({
      message: 'Weekly approval notifications sent',
      sent: sentCount,
    });
  } catch (error: any) {
    console.error('[Weekly Approval] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

