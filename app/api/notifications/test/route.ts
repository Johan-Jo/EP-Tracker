/**
 * API Route: Send test notification
 * POST /api/notifications/test
 */

import { createClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any active subscriptions
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (subsError) {
      console.error('[Test Notification] Error checking subscriptions:', subsError);
      return NextResponse.json({ error: 'Failed to check subscriptions' }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found. Please enable notifications first.' },
        { status: 400 }
      );
    }

    // Send test notification
    const result = await sendNotification({
      userId: user.id,
      type: 'test',
      title: '🎉 EP-Tracker Testnotis',
      body: 'Allt fungerar! Du får nu pushnotiser från EP-Tracker.',
      url: '/dashboard/settings/notifications',
      data: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to send notification',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    console.log(`[Test Notification] Sent to user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error: any) {
    console.error('[Test Notification] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

