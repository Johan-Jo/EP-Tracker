/**
 * API Route: Unsubscribe from push notifications
 * POST /api/notifications/unsubscribe
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (token) {
      // Unsubscribe specific token
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('fcm_token', token);

      if (error) {
        console.error('[Unsubscribe] Error deactivating token:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
      }

      console.log(`[Unsubscribe] User ${user.id} unsubscribed token ${token.slice(0, 20)}...`);
    } else {
      // Unsubscribe all tokens for user
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        console.error('[Unsubscribe] Error deactivating all tokens:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
      }

      console.log(`[Unsubscribe] User ${user.id} unsubscribed all devices`);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error: any) {
    console.error('[Unsubscribe] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

