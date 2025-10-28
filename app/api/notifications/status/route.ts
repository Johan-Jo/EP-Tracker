import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/status
 * Check if user has FCM tokens registered
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any FCM tokens
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (error) {
      console.error('Error checking subscriptions:', error);
      return NextResponse.json({ hasTokens: false });
    }

    const hasTokens = subscriptions && subscriptions.length > 0;

    return NextResponse.json({ hasTokens });
  } catch (error) {
    console.error('Error checking notification status:', error);
    return NextResponse.json({ hasTokens: false });
  }
}

