/**
 * Test endpoint that calls the REAL cron job for check-out reminders
 * This simulates what GitHub Actions does - calls the actual cron endpoint with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Check if user is admin or foreman (for security)
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can test cron jobs' },
        { status: 403 }
      );
    }

    // Get CRON_SECRET from environment
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Test Cron Checkout Real] CRON_SECRET not found in environment variables');
      return NextResponse.json(
        { 
          error: 'CRON_SECRET not configured',
          message: 'Please add CRON_SECRET to your .env.local file. This should be a secure random string used to authenticate cron job requests.',
          hint: 'You can generate one with: openssl rand -hex 32',
        },
        { status: 500 }
      );
    }

    // Call the REAL cron job endpoint with proper authorization
    // This is how GitHub Actions calls the cron endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const cronUrl = `${baseUrl}/api/cron/checkout-reminders`;

    console.log('[Test Cron Checkout Real] Calling real cron endpoint:', cronUrl);

    const cronResponse = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      // Important: Don't cache this request
      cache: 'no-store',
    });

    let cronData;
    try {
      cronData = await cronResponse.json();
    } catch (parseError) {
      const text = await cronResponse.text();
      console.error('[Test Cron Checkout Real] Failed to parse response:', text);
      return NextResponse.json(
        { 
          error: 'Failed to parse cron job response',
          status: cronResponse.status,
          responseText: text,
        },
        { status: 500 }
      );
    }

    console.log('[Test Cron Checkout Real] Cron job response:', {
      status: cronResponse.status,
      ok: cronResponse.ok,
      data: cronData,
    });

    if (!cronResponse.ok) {
      return NextResponse.json(
        { 
          error: cronData.error || 'Cron job failed',
          status: cronResponse.status,
          details: cronData,
        },
        { status: cronResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Real cron job executed successfully',
      ...cronData,
    });
  } catch (error: any) {
    console.error('[Test Cron Checkout Real] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

