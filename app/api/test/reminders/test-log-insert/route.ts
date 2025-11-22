import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Test endpoint to verify notification_log INSERT works
 */
export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    
    console.error('[Test Log Insert] Testing notification_log INSERT...');
    
    // Get a real user_id from the database
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (usersError || !users) {
      console.error('[Test Log Insert] ❌ Failed to get user:', usersError);
      return NextResponse.json({
        success: false,
        error: 'Could not find a user in the database to test with',
        details: usersError,
      }, { status: 500 });
    }

    const testUserId = users.id;
    console.error('[Test Log Insert] Using user_id:', testUserId);
    
    // Try to insert a test notification
    const testNotification = {
      user_id: testUserId,
      type: 'test_notification',
      title: 'Test Notification',
      body: 'This is a test to verify INSERT works',
      data: { test: true },
      delivery_status: 'sent',
      error_message: null,
    };

    console.error('[Test Log Insert] Attempting to insert:', JSON.stringify(testNotification, null, 2));

    const { data, error } = await adminClient
      .from('notification_log')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      console.error('[Test Log Insert] ❌ INSERT failed:', error);
      console.error('[Test Log Insert] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        hint: 'Check if notification_log table has proper INSERT permissions and RLS policies',
      }, { status: 500 });
    }

    console.error('[Test Log Insert] ✅ INSERT successful:', data);

    // Clean up - delete the test notification
    await adminClient
      .from('notification_log')
      .delete()
      .eq('id', data.id);

    return NextResponse.json({
      success: true,
      message: 'INSERT works! Test notification inserted and deleted.',
      inserted: data,
      userId: testUserId,
    });
  } catch (error: any) {
    console.error('[Test Log Insert] ❌ Exception:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}

