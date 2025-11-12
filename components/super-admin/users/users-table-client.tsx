'use client';

import { useState } from 'react';
import { Users as UsersIcon, Mail, Building2, Shield, Calendar, Activity, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { UserDetailModal } from './user-detail-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteUserDialog } from './delete-user-dialog';

const roleDisplayMap: Record<string, string> = {
  admin: 'Admin',
  foreman: 'Arbetsledare',
  worker: 'Arbetare',
  ue: 'UE',
  finance: 'Ekonomi',
  manager: 'Manager',
};

export interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  last_activity: string | null;
  organization_members: Array<{
    role: string;
    organization: {
      id: string;
      name: string;
      status?: string;
    } | null;
    created_at: string;
  }>;
}

interface UsersTableClientProps {
  users: UserData[];
}

export function UsersTableClient({ users }: UsersTableClientProps) {
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const handleRowClick = (user: UserData) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, user: UserData) => {
    e.stopPropagation(); // Prevent row click
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Small delay before clearing selected user to allow modal animation
    setTimeout(() => setSelectedUser(null), 150);
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <UsersIcon className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-700" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No users found</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          It looks like there are no users registered on the platform yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Organization
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Joined
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Last Activity
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => handleRowClick(user)}
                className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-semibold text-white">
                      {(user.full_name || user.email || 'U')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.full_name || user.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.organization_members && user.organization_members.length > 0 ? (
                    <div className="space-y-1">
                      {user.organization_members.map((member, idx) => 
                        member.organization ? (
                          <Link
                            key={idx}
                            href={`/super-admin/organizations/${member.organization.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="group flex items-center gap-2"
                          >
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                              {member.organization.name}
                            </span>
                            {member.organization.status && (
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                  member.organization.status === 'active' &&
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                  member.organization.status === 'trial' &&
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                  member.organization.status === 'suspended' &&
                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                                  member.organization.status === 'deleted' &&
                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                )}
                              >
                                {member.organization.status}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span key={idx} className="text-sm text-gray-500">N/A</span>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {user.organization_members && user.organization_members.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.organization_members.map((member, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                            member.role === 'admin' &&
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                            member.role === 'manager' &&
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                            member.role === 'finance' &&
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            (member.role === 'worker' || member.role === 'ue') &&
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {member.role === 'admin' && <Shield className="h-3 w-3" />}
                          {roleDisplayMap[member.role] ?? member.role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{format(new Date(user.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {user.last_activity ? (
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4 text-green-500" />
                      {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                    </div>
                  ) : (
                    <span className="text-gray-500">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleRowClick(user)}>
                        Visa detaljer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e, user)}
                        className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserDetailModal isOpen={isModalOpen} onClose={handleCloseModal} user={selectedUser} />

      {userToDelete && (
        <DeleteUserDialog
          userId={userToDelete.id}
          userName={userToDelete.full_name || userToDelete.email}
          userEmail={userToDelete.email}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setUserToDelete(null);
            }
          }}
        />
      )}
    </>
  );
}

