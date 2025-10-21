import { createAdminClient } from '@/lib/supabase/server';
import { Users as UsersIcon, Shield, Activity, Search } from 'lucide-react';
import { UsersTableClient } from '@/components/super-admin/users/users-table-client';

/**
 * All Users Page
 * 
 * View and manage all users across all organizations.
 * Super admins can search, filter, and view user details.
 */

export default async function AllUsersPage() {
  // Use admin client to bypass RLS
  const adminClient = createAdminClient();
  
  // Fetch all organization members with their organizations
  const { data: members, error } = await adminClient
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members:', error);
  }

  console.log('Members found:', members?.length || 0);

  // Get user details from auth.users for each member
  const usersWithActivity = [];
  if (members && members.length > 0) {
    for (const member of members) {
      try {
        const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(member.user_id);
        
        if (user && !userError) {
          usersWithActivity.push({
            id: user.id,
            email: user.email || 'Unknown',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            created_at: user.created_at,
            organization_members: [{
              role: member.role,
              organization: member.organization
            }],
            last_activity: user.last_sign_in_at,
          });
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      }
    }
  }

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

