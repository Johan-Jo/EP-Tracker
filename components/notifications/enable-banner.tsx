/**
 * Banner prompting user to enable notifications
 */

'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnableNotificationsBannerProps {
  onEnable: () => void;
  isLoading?: boolean;
}

export function EnableNotificationsBanner({
  onEnable,
  isLoading,
}: EnableNotificationsBannerProps) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-50 to-orange-50 dark:from-blue-900/20 dark:to-orange-900/20 border-2 border-blue-200 dark:border-blue-800 p-6" data-tour="enable-notifications">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aktivera Push-notiser
          </h3>
          <p className="text-gray-600 dark:text-white mb-4">
            Få realtidsuppdateringar om check-ins, godkännanden och påminnelser direkt till din enhet - även när EP-Tracker inte är öppen.
          </p>
          <ul className="space-y-2 mb-4 text-sm text-gray-600 dark:text-white">
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Påminnelser att checka ut i slutet av dagen</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Se när ditt team checkar in och ut</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Få meddelande när tidrapporter behöver godkännas</span>
            </li>
          </ul>
          <Button
            onClick={onEnable}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? 'Aktiverar...' : 'Aktivera Notiser'}
          </Button>
        </div>
      </div>
    </div>
  );
}

