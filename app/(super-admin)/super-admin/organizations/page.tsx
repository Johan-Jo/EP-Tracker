import { getAllOrganizations } from '@/lib/super-admin/organizations';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { Building2, Users, Search, AlertTriangle } from 'lucide-react';
import { OrganizationsTableClient } from '@/components/super-admin/organizations/organizations-table-client';

export const dynamic = 'force-dynamic';

/**
 * Organizations Management Page
 * 
 * View and manage all customer organizations.
 * Super admins can search, filter, and take actions on organizations.
 */

export default async function OrganizationsPage() {
  await requireSuperAdmin();
  const organizations = await getAllOrganizations();

  // Identify duplicates (case-insensitive)
  const nameMap = new Map<string, number>();
  organizations.forEach((org) => {
    const normalizedName = org.name.toLowerCase().trim();
    nameMap.set(normalizedName, (nameMap.get(normalizedName) || 0) + 1);
  });
  
  const duplicateNames = Array.from(nameMap.entries())
    .filter(([_, count]) => count > 1)
    .map(([name]) => name);
  
  const hasDuplicates = duplicateNames.length > 0;

  // Calculate summary stats
  const activeOrgs = organizations.filter(o => o.status === 'active').length;
  const trialOrgs = organizations.filter(o => o.status === 'trial').length;
  const suspendedOrgs = organizations.filter(o => o.status === 'suspended').length;
  const totalUsers = organizations.reduce((sum, o) => sum + (o.user_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Organizations
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage all customer organizations and subscriptions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              className="rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeOrgs}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Trial</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{trialOrgs}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
              <Building2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{suspendedOrgs}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/20">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Warning */}
      {hasDuplicates && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                Dubletter identifierade
              </h3>
              <p className="mt-1 text-sm text-orange-800 dark:text-orange-300">
                {duplicateNames.length} unika namn har dubletter. Kontrollera tabellen nedan för att se vilka organisationer som har samma namn (skiftlägesokänsligt).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <OrganizationsTableClient 
          organizations={organizations} 
          duplicateNames={duplicateNames}
        />
      </div>
    </div>
  );
}

