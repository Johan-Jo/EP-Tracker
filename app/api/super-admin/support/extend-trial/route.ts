import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { extendTrial } from '@/lib/super-admin/support-actions';

/**
 * POST /api/super-admin/support/extend-trial
 * 
 * Extend trial period for an organization
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const body = await request.json();
    const { organization_id, additional_days } = body;
    
    if (!organization_id || !additional_days) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const success = await extendTrial(organization_id, additional_days);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to extend trial' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Trial extended by ${additional_days} days`,
    });
  } catch (error) {
    console.error('Error extending trial:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to extend trial' },
      { status: 500 }
    );
  }
}

