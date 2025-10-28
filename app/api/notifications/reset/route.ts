import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/notifications/reset
 * Reset all notification subscriptions for current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🗑️ Resetting notifications for user ${user.id}`);

    // Delete all push subscriptions for this user
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error deleting subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to reset notifications' },
        { status: 500 }
      );
    }

    console.log(`✅ Reset complete - all tokens deleted for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Notifications reset successfully',
    });
  } catch (error) {
    console.error('❌ Error resetting notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

