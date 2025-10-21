import { NextRequest, NextResponse } from 'next/server';
import { revokeSuperAdmin } from '@/lib/auth/super-admin';
import { z } from 'zod';

/**
 * Revoke Super Admin Privileges
 * POST /api/super-admin/revoke
 * 
 * Revokes super admin privileges from a user.
 * Only existing super admins can revoke this privilege.
 * Cannot revoke your own privileges.
 */

const revokeSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = revokeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { user_id, reason } = validation.data;
    
    const result = await revokeSuperAdmin(user_id, reason);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Super admin privileges revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking super admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

