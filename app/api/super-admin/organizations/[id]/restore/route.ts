import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/super-admin/organizations/[id]/restore
 * 
 * Restore a suspended or deleted organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    
    const supabase = await createClient();
    
    // Get current organization to check its state
    const { data: org } = await supabase
      .from('organizations')
      .select('status, trial_ends_at')
      .eq('id', id)
      .single();
    
    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    // Determine new status
    let newStatus = 'active';
    if (org.trial_ends_at && new Date(org.trial_ends_at) > new Date()) {
      newStatus = 'trial';
    }
    
    // Restore organization
    const { data, error } = await supabase
      .from('organizations')
      .update({ 
        status: newStatus,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error restoring organization:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // TODO: Send notification email to organization owner about restoration
    // TODO: Log restoration in audit log
    
    return NextResponse.json({
      success: true,
      message: 'Organization restored successfully',
      data,
    });
  } catch (error) {
    console.error('Error restoring organization:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to restore organization' },
      { status: 500 }
    );
  }
}

