/**
 * API Route: Notification Preferences
 * GET /api/notifications/preferences - Get user preferences
 * PUT /api/notifications/preferences - Update user preferences
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

    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[Preferences] Error fetching:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return default preferences if not found
    if (!prefs) {
      const defaultPrefs = {
        user_id: user.id,
        checkout_reminders: true,
        team_checkins: true,
        approvals_needed: true,
        approval_confirmed: true,
        ata_updates: true,
        diary_updates: true,
        weekly_summary: true,
        project_checkin_reminders: true,
        project_checkout_reminders: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
      };

      return NextResponse.json(defaultPrefs);
    }

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error('[Preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const updates = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate time format for quiet hours
    if (updates.quiet_hours_start && !/^\d{2}:\d{2}$/.test(updates.quiet_hours_start)) {
      return NextResponse.json({ error: 'Invalid quiet_hours_start format' }, { status: 400 });
    }

    if (updates.quiet_hours_end && !/^\d{2}:\d{2}$/.test(updates.quiet_hours_end)) {
      return NextResponse.json({ error: 'Invalid quiet_hours_end format' }, { status: 400 });
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...updates,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Preferences] Error updating:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    console.log(`[Preferences] Updated for user ${user.id}`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Preferences] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

