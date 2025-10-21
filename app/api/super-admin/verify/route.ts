import { NextResponse } from 'next/server';
import { isSuperAdmin, getSuperAdminDetails } from '@/lib/auth/super-admin';

/**
 * Verify Super Admin Status
 * GET /api/super-admin/verify
 * 
 * Returns whether the current user is a super admin.
 * Used by frontend to conditionally show super admin UI elements.
 */
export async function GET() {
  try {
    const isAdmin = await isSuperAdmin();
    
    if (!isAdmin) {
      return NextResponse.json(
        { is_super_admin: false, message: 'Not authorized' },
        { status: 403 }
      );
    }
    
    // Get full details
    const details = await getSuperAdminDetails();
    
    return NextResponse.json({
      is_super_admin: true,
      details: {
        id: details?.id,
        granted_at: details?.granted_at,
        granted_by: details?.granted_by,
      },
    });
  } catch (error) {
    console.error('Error verifying super admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

