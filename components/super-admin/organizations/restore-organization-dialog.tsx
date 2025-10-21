'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SimpleDialog } from '@/components/ui/simple-dialog';

interface RestoreOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for restoring a suspended/deleted organization
 * 
 * Displays a confirmation dialog to restore access to an organization.
 */
export function RestoreOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: RestoreOrganizationDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organizationId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to restore organization');
      }

      // Success!
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SimpleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore Organization"
      description={`Are you sure you want to restore "${organizationName}"? Users will regain access to the system.`}
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-900/20">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="text-sm">
            <p className="font-medium text-green-900 dark:text-green-200">
              This will restore full access
            </p>
            <p className="mt-1 text-green-700 dark:text-green-300">
              Users will be able to log in and access their data immediately.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Restore Organization
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}

