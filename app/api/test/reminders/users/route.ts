/**
 * API endpoint to fetch users for reminder testing
 * Returns users with email addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can access this' },
        { status: 403 }
      );
    }

    // Get all users in the organization
    const adminClient = createAdminClient();
    const { data: members, error } = await adminClient
      .from('memberships')
      .select(`
        user_id,
        profiles!inner (
          id,
          full_name,
          email
        )
      `)
      .eq('org_id', membership.org_id)
      .eq('is_active', true);

    if (error) {
      console.error('[Test Reminders] Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data
    const users = (members || [])
      .map((member: any) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        return {
          id: member.user_id,
          email: profile?.email || '',
          name: profile?.full_name || profile?.email || 'Okänt namn',
        };
      })
      .filter((u) => u.email) // Only include users with email
      .sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('[Test Reminders] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


