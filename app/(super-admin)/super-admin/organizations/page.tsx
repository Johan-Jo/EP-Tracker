import { getAllOrganizations, formatStorageSize, getStorageUsagePercentage, formatOrganizationStatus, getOrganizationStatusColor } from '@/lib/super-admin/organizations';
import { getMonthlyEquivalent, formatPlanName } from '@/lib/billing/plans';
import { formatCurrency } from '@/lib/billing/mrr-calculator';
import { Building2, Users, HardDrive, Calendar, MoreVertical, Search } from 'lucide-react';
import Link from 'next/link';

/**
 * Organizations Management Page
 * 
 * View and manage all customer organizations.
 * Super admins can search, filter, and take actions on organizations.
 */

export default async function OrganizationsPage() {
  const organizations = await getAllOrganizations();

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

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {organizations.map((org) => {
                const plan = org.plan ? { 
                  ...org.plan, 
                  billing_cycle: (org.plan.billing_cycle as 'monthly' | 'annual'),
                  is_active: true 
                } : null;
                const monthlyMRR = plan ? getMonthlyEquivalent(plan) : 0;
                const statusColor = getOrganizationStatusColor(org.status);
                const storagePercent = plan ? getStorageUsagePercentage(org.storage_used_bytes || 0, plan.max_storage_gb) : 0;
                
                return (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <Link href={`/super-admin/organizations/${org.id}`} className="group">
                        <div className="font-medium text-gray-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                          {org.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {org.project_count || 0} projects
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {plan ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatPlanName(plan)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.max_users} users, {plan.max_storage_gb} GB
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${statusColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${statusColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${statusColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                        ${statusColor === 'gray' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}
                      `}>
                        {formatOrganizationStatus(org.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{org.user_count || 0}</span>
                        {plan && (
                          <span className="text-xs text-gray-500">/ {plan.max_users}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatStorageSize(org.storage_used_bytes || 0)}
                        </div>
                        {plan && (
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div 
                              className={`h-full ${storagePercent >= 80 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(storagePercent, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(monthlyMRR)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(org.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {organizations.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                No organizations found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

