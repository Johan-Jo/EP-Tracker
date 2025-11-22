/**
 * Test endpoint for check-out reminders
 * Allows manual testing of check-out reminder emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCheckOutReminder } from '@/lib/notifications/project-alerts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (for security)
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can test reminders' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, projectId, workDayEnd } = body;

    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'userId and projectId are required' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userName = profile.full_name || profile.email || 'Användare';

    // Send check-out reminder
    await sendCheckOutReminder({
      projectId,
      userId,
      userName,
      workDayEnd: workDayEnd || '16:00',
    });

    return NextResponse.json({
      success: true,
      message: `Check-out påminnelse skickad till ${userName}`,
      userId,
      projectId,
      workDayEnd: workDayEnd || '16:00',
    });
  } catch (error: any) {
    console.error('[Test Check-out Reminder] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


