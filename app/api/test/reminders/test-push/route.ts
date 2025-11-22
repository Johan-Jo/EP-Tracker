import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getMessaging } from '@/lib/notifications/firebase-admin';

/**
 * Test endpoint to send a test push notification directly
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.error('[Test Push] Getting subscriptions for user:', userId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await adminClient
      .from('push_subscriptions')
      .select('fcm_token, id, device_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subsError) {
      console.error('[Test Push] Error fetching subscriptions:', subsError);
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        error: 'No active push subscriptions found for this user',
        hint: 'User needs to enable push notifications in their browser'
      }, { status: 404 });
    }

    console.error(`[Test Push] Found ${subscriptions.length} active subscriptions`);

    const messaging = getMessaging();
    if (!messaging) {
      return NextResponse.json({ error: 'Firebase Messaging not initialized' }, { status: 500 });
    }

    const tokens = subscriptions.map(s => s.fcm_token);
    
    const message = {
      notification: {
        title: '🧪 Test Push Notification',
        body: 'Om du ser detta fungerar push-notifikationer!',
      },
      webpush: {
        notification: {
          icon: '/images/faviconEP.png',
          badge: '/images/faviconEP.png',
        },
      },
      data: {
        url: '/dashboard',
        type: 'test',
        tag: 'test-push-notification',
        icon: '/images/faviconEP.png',
      },
      tokens,
    };

    console.error('[Test Push] Sending to tokens:', tokens.map(t => t.substring(0, 20) + '...'));

    const response = await messaging.sendEachForMulticast(message);

    console.error('[Test Push] Response:', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r, i) => ({
        token: tokens[i].substring(0, 20) + '...',
        success: r.success,
        error: r.error?.message,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Sent test push to ${response.successCount} device(s)`,
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalTokens: tokens.length,
      responses: response.responses.map((r, i) => ({
        token: tokens[i].substring(0, 20) + '...',
        success: r.success,
        error: r.error?.message || null,
      })),
    });
  } catch (error: any) {
    console.error('[Test Push] Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}

