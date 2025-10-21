import { NextRequest, NextResponse } from 'next/server';
import { grantSuperAdmin } from '@/lib/auth/super-admin';
import { z } from 'zod';

/**
 * Grant Super Admin Privileges
 * POST /api/super-admin/grant
 * 
 * Grants super admin privileges to a user.
 * Only existing super admins can grant this privilege.
 */

const grantSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = grantSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { user_id, reason } = validation.data;
    
    const result = await grantSuperAdmin(user_id, reason);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Super admin privileges granted successfully',
    });
  } catch (error) {
    console.error('Error granting super admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

