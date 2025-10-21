import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getAllOrganizations } from '@/lib/super-admin/organizations';

/**
 * GET /api/super-admin/organizations
 * 
 * Get all organizations with details
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const searchParams = request.nextUrl.searchParams;
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    
    const organizations = await getAllOrganizations(includeDeleted);
    
    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

