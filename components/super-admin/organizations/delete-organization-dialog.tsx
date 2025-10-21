'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { SimpleDialog } from '@/components/ui/simple-dialog';

interface DeleteOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for soft-deleting an organization
 * 
 * Displays a confirmation dialog with a 30-day grace period warning.
 * Organization can be restored within 30 days.
 */
export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete organization');
      }

      // Success! Redirect to organizations list
      onOpenChange(false);
      router.push('/super-admin/organizations');
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
      title="Delete Organization"
      description={`Are you sure you want to delete "${organizationName}"?`}
    >
      <div className="space-y-4">
        {/* Danger Warning */}
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-medium text-red-900 dark:text-red-200">
              This is a destructive action
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-red-700 dark:text-red-300">
              <li>All users will lose access immediately</li>
              <li>Organization will be marked as deleted</li>
              <li>Can be restored within 30 days</li>
              <li>After 30 days, data may be permanently deleted</li>
            </ul>
          </div>
        </div>

        {/* Confirmation Input */}
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            id="confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          />
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
            onClick={handleDelete}
            disabled={!isConfirmed || isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Organization
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}

