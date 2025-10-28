import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notifications';

/**
 * POST /api/notifications/test
 * Send a test notification to the current user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || 'där';

    // Check if Firebase is configured
    const { messaging } = await import('@/lib/notifications/firebase-admin');
    
    if (!messaging) {
      console.error('❌ Firebase Admin SDK not initialized');
      return NextResponse.json(
        { 
          error: 'Firebase not configured. Check environment variables:\n' +
                 '- FIREBASE_PROJECT_ID\n' +
                 '- FIREBASE_CLIENT_EMAIL\n' +
                 '- FIREBASE_PRIVATE_KEY'
        },
        { status: 500 }
      );
    }

    // Check if user has FCM token
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', user.id);

    if (!subscriptions || subscriptions.length === 0) {
      console.error('❌ No FCM tokens found for user');
      return NextResponse.json(
        { 
          error: 'No FCM tokens found. Please enable notifications first by clicking "Aktivera notiser".'
        },
        { status: 400 }
      );
    }

    console.log(`📤 Sending test notification to user ${user.id} (${subscriptions.length} devices)`);

    // Send test notification (skip quiet hours for test)
    const result = await sendNotification({
      userId: user.id,
      type: 'test',
      title: '🎉 Test-notis fungerar!',
      body: `Hej ${userName}! Dina pushnotiser är korrekt konfigurerade.`,
      url: '/dashboard',
      data: {
        test: 'true',
      },
      skipQuietHours: true, // Always send test notifications
    });

    if (!result) {
      console.error('❌ Failed to send notification (null result)');
      return NextResponse.json(
        { error: 'Failed to send notification. Check server logs for details.' },
        { status: 500 }
      );
    }

    console.log(`✅ Test notification sent successfully!`);

    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

