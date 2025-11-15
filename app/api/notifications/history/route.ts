/**
 * API Route: Notification History
 * GET /api/notifications/history - Get notification log for user
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('notification_log')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('[History] Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[History] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

