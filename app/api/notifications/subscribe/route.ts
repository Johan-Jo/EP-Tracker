import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications by saving FCM token
 */
export async function POST(request: NextRequest) {
  try {
    const { token, deviceInfo } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'FCM token required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upsert subscription (update if exists, insert if not)
    const { error: subError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        fcm_token: token,
        device_type: deviceInfo?.type || 'unknown',
        device_name: deviceInfo?.name || 'Unknown Device',
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'fcm_token',
      }
    );

    if (subError) {
      console.error('Error saving subscription:', subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Create default preferences if they don't exist
    const { error: prefError } = await supabase.from('notification_preferences').upsert(
      {
        user_id: user.id,
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: true,
      }
    );

    if (prefError) {
      console.error('Error creating preferences:', prefError);
      // Don't fail the request, preferences will be created on first access
    }

    console.log(`✅ Subscribed user ${user.id} to push notifications`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

