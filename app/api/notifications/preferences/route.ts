import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no preferences exist, return defaults
    if (!data) {
      return NextResponse.json({
        preferences: {
          checkout_reminders: true,
          team_checkins: true,
          approvals_needed: true,
          approval_confirmed: true,
          ata_updates: true,
          diary_updates: true,
          weekly_summary: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
        },
      });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const preferences = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

