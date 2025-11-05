'use client';

import { useState } from 'react';
import { Building2, Users, Calendar, MoreVertical, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatStorageSize, getStorageUsagePercentage, formatOrganizationStatus, getOrganizationStatusColor } from '@/lib/super-admin/organizations-formatters';
import { getMonthlyEquivalent, formatPlanName } from '@/lib/billing/plans-formatters';
import { formatCurrency } from '@/lib/billing/mrr-formatters';
import type { OrganizationWithDetails } from '@/lib/super-admin/organizations-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteOrganizationTableDialog } from './delete-organization-table-dialog';

interface OrganizationsTableClientProps {
  organizations: OrganizationWithDetails[];
  duplicateNames: string[];
}

export function OrganizationsTableClient({ organizations, duplicateNames }: OrganizationsTableClientProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);

  const isDuplicate = (orgName: string): boolean => {
    return duplicateNames.includes(orgName.toLowerCase().trim());
  };

  const handleDeleteClick = (org: OrganizationWithDetails, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    console.log('Delete clicked for org:', org.id, org.name);
    setSelectedOrg({ id: org.id, name: org.name });
    setDeleteDialogOpen(true);
  };

  if (organizations.length === 0) {
    return (
      <div className="py-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No organizations found
        </p>
      </div>
    );
  }

  return (
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
            const duplicate = isDuplicate(org.name);
            
            return (
              <tr 
                key={org.id} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-900 ${
                  duplicate ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <Link href={`/super-admin/organizations/${org.id}`} className="group">
                    <div className="flex items-center gap-2">
                      <div className={`font-medium group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400 ${
                        duplicate ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900'
                      }`}>
                        {org.name}
                      </div>
                      {duplicate && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          Dubblett
                        </span>
                      )}
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
                    <span>{format(new Date(org.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/super-admin/organizations/${org.id}`} className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Visa detaljer
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(org, e);
                        }}
                        className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                        onSelect={(e) => {
                          e.preventDefault();
                          handleDeleteClick(org);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedOrg && (
        <DeleteOrganizationTableDialog
          organizationId={selectedOrg.id}
          organizationName={selectedOrg.name}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setSelectedOrg(null);
            }
          }}
        />
      )}
    </div>
  );
}

