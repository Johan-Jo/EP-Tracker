/**
 * Debug endpoint to check why notifications aren't being sent
 * Shows user preferences, subscriptions, and delivery method
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or foreman
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can debug' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const debug: any = {
      userId,
      timestamp: new Date().toISOString(),
    };

    // 1. Check user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    debug.preferences = {
      exists: !!prefs,
      error: prefsError?.message,
      checkout_reminders: prefs?.checkout_reminders,
      delivery_methods: prefs?.delivery_methods,
      quiet_hours_enabled: prefs?.quiet_hours_enabled,
      quiet_hours_start: prefs?.quiet_hours_start,
      quiet_hours_end: prefs?.quiet_hours_end,
    };

    // 2. Check push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, fcm_token, device_type, is_active, created_at, last_used_at')
      .eq('user_id', userId);

    debug.subscriptions = {
      count: subscriptions?.length || 0,
      active: subscriptions?.filter(s => s.is_active).length || 0,
      error: subsError?.message,
      subscriptions: subscriptions?.map(s => ({
        id: s.id,
        device_type: s.device_type,
        is_active: s.is_active,
        created_at: s.created_at,
        last_used_at: s.last_used_at,
        token_preview: s.fcm_token?.substring(0, 20) + '...',
      })),
    };

    // 3. Check active time entries
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select('id, project_id, start_at, stop_at, projects!inner(name)')
      .eq('user_id', userId)
      .is('stop_at', null)
      .order('start_at', { ascending: false })
      .limit(5);

    debug.activeTimeEntries = {
      count: entries?.length || 0,
      error: entriesError?.message,
      entries: entries?.map(e => ({
        id: e.id,
        project_id: e.project_id,
        project_name: Array.isArray(e.projects) ? e.projects[0]?.name : e.projects?.name,
        start_at: e.start_at,
        hours_worked: e.stop_at ? null : ((Date.now() - new Date(e.start_at).getTime()) / (1000 * 60 * 60)).toFixed(2),
      })),
    };

    // 4. Check user email
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    debug.userEmail = {
      email: userData?.user?.email,
      error: userError?.message,
    };

    // 5. Check if in quiet hours
    try {
      const { data: inQuietHours, error: quietError } = await supabase.rpc('is_in_quiet_hours', {
        p_user_id: userId,
      });
      debug.quietHours = {
        inQuietHours: inQuietHours || false,
        error: quietError?.message,
      };
    } catch (error: any) {
      debug.quietHours = {
        inQuietHours: false,
        error: error.message,
      };
    }

    // 6. Calculate what would happen if we send a notification
    const prefKey = 'checkout_reminders';
    const isEnabled = prefs ? prefs[prefKey] !== false : true;
    const deliveryMethods = prefs?.delivery_methods || { checkout_reminders: 'push' };
    const deliveryMethod = (deliveryMethods[prefKey] || 'push') as 'push' | 'email' | 'both';
    const hasActiveSubscriptions = (subscriptions?.filter(s => s.is_active).length || 0) > 0;

    debug.notificationDecision = {
      type: 'checkout_reminder',
      prefKey,
      isEnabled,
      deliveryMethod,
      hasActiveSubscriptions,
      wouldSendPush: (deliveryMethod === 'push' || deliveryMethod === 'both') && hasActiveSubscriptions && !debug.quietHours.inQuietHours,
      wouldSendEmail: deliveryMethod === 'email' || deliveryMethod === 'both' || (deliveryMethod === 'push' && !hasActiveSubscriptions),
      reason: !isEnabled 
        ? 'Notification type disabled in preferences'
        : deliveryMethod === 'push' && !hasActiveSubscriptions && !debug.quietHours.inQuietHours
        ? 'Would fallback to email (no push subscriptions)'
        : deliveryMethod === 'push' && debug.quietHours.inQuietHours
        ? 'Would fallback to email (quiet hours)'
        : 'Should send notification',
    };

    return NextResponse.json(debug);
  } catch (error: any) {
    console.error('[Debug Reminders] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: error.stack },
      { status: 500 }
    );
  }
}

