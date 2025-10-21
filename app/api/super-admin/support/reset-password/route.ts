import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { sendPasswordResetEmail } from '@/lib/super-admin/support-actions';

/**
 * POST /api/super-admin/support/reset-password
 * 
 * Send password reset email to a user
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const { user_email } = body;
    
    if (!user_email) {
      return NextResponse.json(
        { success: false, error: 'Missing user_email' },
        { status: 400 }
      );
    }
    
    const success = await sendPasswordResetEmail(user_email);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    console.error('Error sending password reset:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}

