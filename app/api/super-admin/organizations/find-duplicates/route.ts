import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/organizations/find-duplicates
 * Find duplicate organizations by name (case-insensitive)
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const adminClient = createAdminClient();
    
    // Get all organizations
    const { data: orgs, error } = await adminClient
      .from('organizations')
      .select('id, name, created_at, status, deleted_at')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    // Group by normalized name (lowercase, trimmed)
    const nameGroups = new Map<string, Array<{
      id: string;
      name: string;
      created_at: string;
      status: string;
    }>>();
    
    (orgs || []).forEach((org) => {
      const normalizedName = org.name.toLowerCase().trim();
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push({
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        status: org.status || 'active',
      });
    });
    
    // Find duplicates (groups with more than 1 org)
    const duplicates: Array<{
      normalizedName: string;
      organizations: Array<{
        id: string;
        name: string;
        created_at: string;
        status: string;
      }>;
    }> = [];
    
    nameGroups.forEach((orgs, normalizedName) => {
      if (orgs.length > 1) {
        duplicates.push({
          normalizedName,
          organizations: orgs.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      totalOrganizations: orgs?.length || 0,
      duplicateGroups: duplicates.length,
      duplicates: duplicates.map((group) => ({
        name: group.normalizedName,
        count: group.organizations.length,
        organizations: group.organizations,
        recommended: group.organizations[0], // Oldest one as recommended to keep
      })),
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

