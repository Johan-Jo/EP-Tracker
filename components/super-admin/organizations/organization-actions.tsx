'use client';

import { useState } from 'react';
import { SuspendOrganizationDialog } from './suspend-organization-dialog';
import { RestoreOrganizationDialog } from './restore-organization-dialog';
import { DeleteOrganizationDialog } from './delete-organization-dialog';

interface OrganizationActionsProps {
  organizationId: string;
  organizationName: string;
  currentStatus: string;
}

/**
 * Organization Actions Component
 * 
 * Provides action buttons and dialogs for managing an organization.
 * Displays different actions based on the organization's current status.
 */
export function OrganizationActions({
  organizationId,
  organizationName,
  currentStatus,
}: OrganizationActionsProps) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSuspended = currentStatus === 'suspended';
  const isDeleted = currentStatus === 'deleted';

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Edit button (always visible) */}
        <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900">
          Edit Organization
        </button>
        
        {/* Restore button (if suspended or deleted) */}
        {(isSuspended || isDeleted) && (
          <button
            onClick={() => setRestoreOpen(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Restore
          </button>
        )}
        
        {/* Suspend button (if active or trial) */}
        {!isSuspended && !isDeleted && (
          <button
            onClick={() => setSuspendOpen(true)}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Suspend
          </button>
        )}
        
        {/* Delete button (if not already deleted) */}
        {!isDeleted && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>

      {/* Dialogs */}
      <SuspendOrganizationDialog
        organizationId={organizationId}
        organizationName={organizationName}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
      />
      
      <RestoreOrganizationDialog
        organizationId={organizationId}
        organizationName={organizationName}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
      />
      
      <DeleteOrganizationDialog
        organizationId={organizationId}
        organizationName={organizationName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

