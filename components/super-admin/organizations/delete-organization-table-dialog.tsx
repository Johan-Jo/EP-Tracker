'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteOrganizationTableDialogProps {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for deleting an organization from the table view
 * 
 * Requires confirmation by typing 'DELETE'.
 */
export function DeleteOrganizationTableDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: DeleteOrganizationTableDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleDelete = async () => {
    if (!isConfirmed) {
      setError('Du måste skriva DELETE för att bekräfta');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Deleting organization:', organizationId);
      
      const response = await fetch(`/api/super-admin/organizations/${organizationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Delete response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to delete organization: ${response.statusText}`);
      }

      // Success! Refresh the page
      onOpenChange(false);
      router.refresh();
      router.push('/super-admin/organizations');
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle>Ta bort organisation</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Organisationen kommer att markeras som borttagen med en 30-dagars återställningsperiod.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              Observera: Detta är en mjuk borttagning (soft delete).
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-orange-800 dark:text-orange-300">
              <li>Organisationen markeras som borttagen</li>
              <li>Alla data bevaras i 30 dagar</li>
              <li>Organisationen kan återställas inom 30 dagar</li>
              <li>Efter 30 dagar kan data tas bort permanent</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Skriv <span className="font-mono font-semibold">DELETE</span> för att bekräfta:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={isLoading}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Organisation att ta bort:
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {organizationName}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || isLoading}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              'Tar bort...'
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Ta bort organisation
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

