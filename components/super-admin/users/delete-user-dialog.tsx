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

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for deleting a user
 * 
 * Requires confirmation by typing the user's email.
 */
export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  open,
  onOpenChange,
}: DeleteUserDialogProps) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmEmail.toLowerCase().trim() === userEmail.toLowerCase().trim();

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      // Success! Refresh the page
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmEmail('');
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
              <AlertDialogTitle>Ta bort användare</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Denna åtgärd kan inte ångras.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Varning: Detta kommer att permanent ta bort användaren från systemet.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-300">
              <li>Alla medlemskap i organisationer tas bort</li>
              <li>Användarens profil tas bort</li>
              <li>Användarens autentiseringskonto tas bort</li>
              <li>Detta kan inte ångras</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Skriv användarens e-postadress för att bekräfta:
            </Label>
            <Input
              id="confirm-email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={userEmail}
              disabled={isLoading}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Användare att ta bort:
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {userName || 'Namn saknas'} ({userEmail})
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
                Ta bort permanent
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

