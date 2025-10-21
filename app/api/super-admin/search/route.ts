import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';

/**
 * Global Search API
 * 
 * Searches across users and organizations
 * GET /api/super-admin/search?q=query
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin access
    await requireSuperAdmin();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const adminClient = createAdminClient();
    const searchTerm = `%${query.toLowerCase()}%`;

    // Search organizations
    const { data: orgs } = await adminClient
      .from('organizations')
      .select('id, name, status, created_at')
      .or(`name.ilike.${searchTerm}`)
      .limit(10);

    // Search organization members
    const { data: members } = await adminClient
      .from('organization_members')
      .select(`
        user_id,
        role,
        organization:organizations(id, name, status)
      `)
      .limit(20);

    // Get user details from auth.users
    const results: Array<{
      type: 'user' | 'organization';
      id: string;
      title: string;
      subtitle: string;
      status?: string;
    }> = [];

    // Add organizations to results
    if (orgs) {
      for (const org of orgs) {
        results.push({
          type: 'organization',
          id: org.id,
          title: org.name,
          subtitle: `Organization`,
          status: org.status,
        });
      }
    }

    // Add users to results
    if (members) {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({
        perPage: 100,
      });

      const authUsersMap = new Map(authUsers?.users.map((u) => [u.id, u]) || []);

      for (const member of members) {
        const authUser = authUsersMap.get(member.user_id);
        if (authUser) {
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown';
          const email = authUser.email || '';

          // Check if name or email matches search query
          if (
            fullName.toLowerCase().includes(query.toLowerCase()) ||
            email.toLowerCase().includes(query.toLowerCase())
          ) {
            results.push({
              type: 'user',
              id: authUser.id,
              title: fullName,
              subtitle: email,
              status: undefined,
            });
          }
        }
      }
    }

    // Remove duplicates and limit results
    const uniqueResults = results
      .filter((result, index, self) => 
        index === self.findIndex((r) => r.type === result.type && r.id === result.id)
      )
      .slice(0, 10);

    return NextResponse.json({ results: uniqueResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

