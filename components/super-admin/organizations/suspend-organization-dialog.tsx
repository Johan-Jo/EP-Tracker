'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { SimpleDialog } from '@/components/ui/simple-dialog';

interface SuspendOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for suspending an organization
 * 
 * Displays a confirmation dialog and allows the super admin to
 * provide a reason for the suspension.
 */
export function SuspendOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: SuspendOrganizationDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuspend = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/organizations/${organizationId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to suspend organization');
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
      title="Suspend Organization"
      description={`Are you sure you want to suspend "${organizationName}"? All users will be blocked from accessing the system.`}
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-900/20">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div className="text-sm">
            <p className="font-medium text-orange-900 dark:text-orange-200">
              This action will immediately block access
            </p>
            <p className="mt-1 text-orange-700 dark:text-orange-300">
              Users will not be able to log in or access any data until the organization is restored.
            </p>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason for suspension (optional)
          </label>
          <textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason for this suspension..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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
            onClick={handleSuspend}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Suspend Organization
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}

