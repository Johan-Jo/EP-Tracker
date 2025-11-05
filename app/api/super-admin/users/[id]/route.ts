import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * DELETE /api/super-admin/users/[id]
 * 
 * Delete a user completely (hard delete)
 * Super admin only - removes user from all tables including auth.users
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id: userId } = await params;
    
    const adminClient = createAdminClient();
    
    // Get user info for logging
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle();
    
    console.log(`[Super Admin] Deleting user: ${userId} (${profile?.email || 'unknown'})`);
    
    // 1. Delete from memberships (using admin client to bypass RLS)
    const { error: membershipDeleteError } = await adminClient
      .from('memberships')
      .delete()
      .eq('user_id', userId);
    
    if (membershipDeleteError) {
      console.error('Error deleting memberships:', membershipDeleteError);
      // Continue anyway
    }
    
    // 2. Delete from profiles (using admin client to bypass RLS)
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      // Continue anyway
    }
    
    // 3. Delete from auth.users (admin only)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user from auth system: ' + authDeleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `User ${profile?.email || userId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
}

