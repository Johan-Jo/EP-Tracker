import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getOrganizationById } from '@/lib/super-admin/organizations';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/organizations/[id]
 * 
 * Get organization details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    
    const organization = await getOrganizationById(id);
    
    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/organizations/[id]
 * 
 * Update organization details (name, plan, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    
    const supabase = await createClient();
    
    // Build update object
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.plan_id) updates.plan_id = body.plan_id;
    if (body.status) updates.status = body.status;
    
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating organization:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/organizations/[id]
 * 
 * Soft delete an organization (sets deleted_at timestamp)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    
    console.log(`[Super Admin] Deleting organization: ${id}`);
    
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Soft delete by setting deleted_at
    const { data, error } = await supabase
      .from('organizations')
      .update({ 
        deleted_at: new Date().toISOString(),
        status: 'deleted',
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error deleting organization:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.log(`[Super Admin] Organization ${id} deleted successfully`);
    
    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
      data,
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete organization' },
      { status: 500 }
    );
  }
}

