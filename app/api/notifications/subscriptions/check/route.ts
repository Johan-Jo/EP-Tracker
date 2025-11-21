/**
 * API Route: Check if user has active subscriptions
 * GET /api/notifications/subscriptions/check
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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
      console.error('[Check Subscriptions] Error checking subscriptions:', subsError);
      return NextResponse.json(
        { hasActiveSubscription: false, error: 'Failed to check subscriptions' },
        { status: 500 }
      );
    }

    const hasActiveSubscription = (subs && subs.length > 0) || false;

    return NextResponse.json({
      hasActiveSubscription,
    });
  } catch (error: any) {
    console.error('[Check Subscriptions] Unexpected error:', error);
    return NextResponse.json(
      { hasActiveSubscription: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

