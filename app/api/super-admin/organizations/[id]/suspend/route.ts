import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/super-admin/organizations/[id]/suspend
 * 
 * Suspend an organization (blocks all access)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;
    
    const supabase = await createClient();
    
    // Update organization status to suspended
    const { data, error } = await supabase
      .from('organizations')
      .update({ 
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error suspending organization:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // TODO: Send notification email to organization owner about suspension
    // TODO: Log suspension reason in audit log
    
    return NextResponse.json({
      success: true,
      message: 'Organization suspended successfully',
      data,
    });
  } catch (error) {
    console.error('Error suspending organization:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to suspend organization' },
      { status: 500 }
    );
  }
}

