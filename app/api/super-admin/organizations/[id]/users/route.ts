import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

/**
 * GET /api/super-admin/organizations/[id]/users
 * 
 * Get all users in an organization
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<RouteParams>
) {
  try {
    await requireSuperAdmin();
    const { id } = await resolveRouteParams(context);
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Organization id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get organization members with user details
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users!inner(*)
      `)
      .eq('organization_id', id)
      .order('joined_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching organization users:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: members || [],
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization users' },
      { status: 500 }
    );
  }
}

