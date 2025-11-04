import { createAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { Users as UsersIcon, Shield, Activity, Search } from 'lucide-react';
import { UsersTableClient, type UserData } from '@/components/super-admin/users/users-table-client';

export const dynamic = 'force-dynamic';

/**
 * All Users Page
 * 
 * View and manage all users across all organizations.
 * Super admins can search, filter, and view user details.
 */

export default async function AllUsersPage() {
  await requireSuperAdmin();
  // Use admin client to bypass RLS
  const adminClient = createAdminClient();
  
  // Fetch all memberships with profiles and organizations
  const { data: memberships, error } = await adminClient
    .from('memberships')
    .select(`
      *,
      profiles (
        id,
        email,
        full_name,
        phone,
        created_at
      ),
      organizations (
        id,
        name,
        status
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching memberships:', error);
  }

  console.log('Memberships found:', memberships?.length || 0);

  // Transform data to group by user (users can be in multiple orgs)
  const usersMap = new Map<string, {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
    organization_members: Array<{
      role: string;
      organization: { id: string; name: string; status?: string } | null;
      created_at: string;
    }>;
    last_activity: string | null;
  }>();

  if (memberships && memberships.length > 0) {
    for (const membership of memberships) {
      const profile = Array.isArray(membership.profiles) 
        ? membership.profiles[0] 
        : membership.profiles;
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;

      if (!profile) continue;

      const userId = profile.id;
      
      if (!usersMap.has(userId)) {
        // Get last database activity (not just login)
        // Check activity_log first (if it exists), then fall back to checking multiple tables
        let lastActivity: string | null = null;
        
        try {
          // Try activity_log first (most efficient - tracks all database activity)
          const { data: activityLog } = await adminClient
            .from('activity_log')
            .select('created_at')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (activityLog?.created_at) {
            lastActivity = activityLog.created_at;
          } else {
            // Fallback: Check multiple tables for last activity
            // Use updated_at if available, otherwise created_at
            const activityQueries = await Promise.all([
              // Time entries
              adminClient
                .from('time_entries')
                .select('created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              // Materials
              adminClient
                .from('materials')
                .select('created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              // Expenses
              adminClient
                .from('expenses')
                .select('created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              // Mileage
              adminClient
                .from('mileage')
                .select('created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              // Diary entries
              adminClient
                .from('diary_entries')
                .select('created_at, updated_at')
                .eq('created_by', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);
            
            // Find the most recent activity across all tables
            const allActivities = activityQueries
              .map((result) => {
                if (result?.data) {
                  const entry = result.data as any;
                  return entry.updated_at || entry.created_at;
                }
                return null;
              })
              .filter((date): date is string => date !== null);
            
            if (allActivities.length > 0) {
              // Sort and get the most recent
              allActivities.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              lastActivity = allActivities[0];
            }
          }
        } catch (err) {
          console.error(`Error fetching last activity for user ${userId}:`, err);
          // Keep lastActivity as null
        }

        usersMap.set(userId, {
          id: userId,
          email: profile.email || 'Unknown',
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at || membership.created_at,
          organization_members: [{
            role: membership.role,
            organization: organization ? { 
              id: organization.id, 
              name: organization.name,
              status: (organization as any).status || 'active'
            } : null,
            created_at: membership.created_at,
          }],
          last_activity: lastActivity,
        });
      } else {
        // User already exists, add this organization membership
        const existingUser = usersMap.get(userId)!;
        existingUser.organization_members.push({
          role: membership.role,
          organization: organization ? { 
            id: organization.id, 
            name: organization.name,
            status: (organization as any).status || 'active'
          } : null,
          created_at: membership.created_at,
        });
      }
    }
  }

  const usersWithActivity: UserData[] = Array.from(usersMap.values());

  console.log('Users with activity:', usersWithActivity.length);

  // Calculate stats
  const totalUsers = usersWithActivity.length;
  const activeUsers = usersWithActivity.filter(u => u.last_activity).length;
  const adminUsers = usersWithActivity.filter(u => 
    u.organization_members?.some((m: any) => m.role === 'admin')
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage all users across the platform
          </p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
              <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/20">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{adminUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <UsersTableClient users={usersWithActivity} />
      </div>
    </div>
  );
}

