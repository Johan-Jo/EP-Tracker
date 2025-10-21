import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/users
 * 
 * Get all users across all organizations
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const organizationId = searchParams.get('organization_id');
    const role = searchParams.get('role');
    
    const supabase = await createClient();
    
    // Build query
    let query = supabase
      .from('users')
      .select(`
        *,
        organization_members!inner(
          organization_id,
          role,
          joined_at,
          organization:organizations(id, name, status)
        )
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    if (organizationId) {
      query = query.eq('organization_members.organization_id', organizationId);
    }
    
    if (role) {
      query = query.eq('organization_members.role', role);
    }
    
    const { data: users, error } = await query;
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // Get last activity for each user
    const usersWithActivity = await Promise.all(
      (users || []).map(async (user) => {
        const { data: lastEntry } = await supabase
          .from('time_entries')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          ...user,
          last_activity: lastEntry?.created_at || null,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: usersWithActivity,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

