/**
 * API Route: Subscribe to push notifications
 * POST /api/notifications/subscribe
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, deviceInfo } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert subscription (update if exists, insert if not)
    const { error: subsError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          fcm_token: token,
          device_type: deviceInfo?.type || 'unknown',
          device_name: deviceInfo?.name || null,
          user_agent: deviceInfo?.userAgent || null,
          last_used_at: new Date().toISOString(),
          is_active: true,
        },
        {
          onConflict: 'fcm_token',
        }
      );

    if (subsError) {
      console.error('[Subscribe] Error upserting subscription:', subsError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    // Create default preferences if not exists
    const { error: prefsError } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
      })
      .select()
      .maybeSingle();

    // Ignore conflict error (preferences already exist)
    if (prefsError && prefsError.code !== '23505') {
      console.error('[Subscribe] Error creating preferences:', prefsError);
    }

    console.log(`[Subscribe] User ${user.id} subscribed successfully`);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error: any) {
    console.error('[Subscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

