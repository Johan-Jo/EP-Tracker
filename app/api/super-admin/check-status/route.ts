import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/check-status
 * Check if current user is super admin (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        isSuperAdmin: false,
        error: 'Not authenticated',
      });
    }

    // Check super admin status
    const { data: superAdminData, error: superAdminError } = await supabase
      .from('super_admins')
      .select('id, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      userEmail: user.email,
      isSuperAdmin: !!superAdminData,
      superAdminError: superAdminError?.message,
      superAdminData,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

