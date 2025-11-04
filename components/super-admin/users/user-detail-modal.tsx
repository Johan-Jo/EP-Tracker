'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { Mail, Building2, Shield, Calendar, Activity, User, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
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
    phone: string | null;
  } | null;
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>User Details</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-bold text-white">
              {initials}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.full_name || user.email}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                Joined
              </div>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {format(new Date(user.created_at), 'PPP')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                <Activity className="h-4 w-4" />
                Last Activity
              </div>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {user.last_activity
                  ? format(new Date(user.last_activity), 'PPP')
                  : 'Never'}
              </p>
              {user.last_activity && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Organizations & Roles */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Building2 className="h-4 w-4" />
              Organizations & Roles
            </h4>

            {user.organization_members && user.organization_members.length > 0 ? (
              <div className="space-y-2">
                {user.organization_members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <Link
                      href={`/super-admin/organizations/${member.organization.id}`}
                      className="flex items-center gap-2 text-orange-600 hover:underline dark:text-orange-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{member.organization.name}</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'text-xs',
                          member.organization.status === 'active' &&
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                          member.organization.status === 'trial' &&
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                          member.organization.status === 'suspended' &&
                            'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
                          member.organization.status === 'deleted' &&
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        )}
                      >
                        {member.organization.status}
                      </Badge>

                      <Badge
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          member.role === 'admin' &&
                            'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
                          member.role === 'manager' &&
                            'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
                          member.role === 'finance' &&
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                          member.role === 'worker' &&
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        )}
                      >
                        <Shield className="h-3 w-3" />
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 p-8 text-center dark:border-gray-800">
                <User className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Not associated with any organization
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

