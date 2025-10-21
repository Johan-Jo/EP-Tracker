'use client';

import { useState } from 'react';
import { Clock, Mail, HardDrive, AlertCircle, Loader2 } from 'lucide-react';

interface SupportActionsPanelProps {
  organizationId: string;
  organizationName: string;
  trialEndsAt: string | null;
  userEmails: string[];
}

/**
 * Support Actions Panel
 * 
 * Provides quick access to common support tasks for an organization.
 */
export function SupportActionsPanel({
  organizationId,
  organizationName,
  trialEndsAt,
  userEmails,
}: SupportActionsPanelProps) {
  const [isExtendingTrial, setIsExtendingTrial] = useState(false);
  const [isGrantingStorage, setIsGrantingStorage] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExtendTrial = async (days: number) => {
    setIsExtendingTrial(true);
    setMessage(null);

    try {
      const response = await fetch('/api/super-admin/support/extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          additional_days: days,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Trial extended by ${days} days!` });
        // Refresh the page after a short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to extend trial' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsExtendingTrial(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setIsResettingPassword(true);
    setMessage(null);

    try {
      const response = await fetch('/api/super-admin/support/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Password reset email sent to ${email}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send reset email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`rounded-md p-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Extend Trial */}
      {trialEndsAt && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Extend Trial</h4>
          </div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Current trial ends: {new Date(trialEndsAt).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleExtendTrial(7)}
              disabled={isExtendingTrial}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isExtendingTrial && <Loader2 className="h-4 w-4 animate-spin" />}
              +7 Days
            </button>
            <button
              onClick={() => handleExtendTrial(14)}
              disabled={isExtendingTrial}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isExtendingTrial && <Loader2 className="h-4 w-4 animate-spin" />}
              +14 Days
            </button>
            <button
              onClick={() => handleExtendTrial(30)}
              disabled={isExtendingTrial}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isExtendingTrial && <Loader2 className="h-4 w-4 animate-spin" />}
              +30 Days
            </button>
          </div>
        </div>
      )}

      {/* Reset Password */}
      {userEmails.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Reset User Password</h4>
          </div>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Send password reset email to a user
          </p>
          <div className="space-y-2">
            {userEmails.slice(0, 5).map((email) => (
              <div key={email} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                <button
                  onClick={() => handleResetPassword(email)}
                  disabled={isResettingPassword}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isResettingPassword && <Loader2 className="h-3 w-3 animate-spin" />}
                  Send Reset
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grant Storage (UI only - not fully implemented) */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-3 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Grant Storage</h4>
        </div>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Temporarily increase storage limit
        </p>
        <div className="flex gap-2">
          <button
            disabled
            className="rounded-md bg-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 opacity-50 cursor-not-allowed"
          >
            +5 GB
          </button>
          <button
            disabled
            className="rounded-md bg-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 opacity-50 cursor-not-allowed"
          >
            +10 GB
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-2">
            (Coming soon)
          </span>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-900/20">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-orange-900 dark:text-orange-200">
            Support Actions
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-300">
            All actions are logged and auditable. Use with care.
          </p>
        </div>
      </div>
    </div>
  );
}

