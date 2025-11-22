/**
 * Main notification settings component
 */

'use client';

import { Bell, Clock, Users, CheckSquare, FileEdit, BookOpen, TrendingUp, Send } from 'lucide-react';
import { EnableNotificationsBanner } from './enable-banner';
import { NotificationToggle } from './notification-toggle';
import { QuietHoursSelector } from './quiet-hours-selector';
import { Button } from '@/components/ui/button';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { useNotificationPreferences } from '@/lib/hooks/use-notification-preferences';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface NotificationSettingsProps {
  userRole?: string;
}

export function NotificationSettings({ userRole = 'worker' }: NotificationSettingsProps) {
  const { permission, isSupported, isLoading: permissionLoading, requestPermission, hasActiveSubscription } = useNotificationPermission();
  const { preferences, isLoading: prefsLoading, updatePreferences } = useNotificationPreferences();
  
  // Only admins, foremen, and finance can approve time reports
  const canApprove = userRole && ['admin', 'foreman', 'finance'].includes(userRole);

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value } as any);
  };

  const handleDeliveryMethodChange = async (key: string, method: 'push' | 'email' | 'both') => {
    const currentMethods = preferences?.delivery_methods || {
      checkout_reminders: 'push',
      team_checkins: 'push',
      approvals_needed: 'push',
      approval_confirmed: 'push',
      ata_updates: 'push',
      diary_updates: 'push',
      weekly_summary: 'push',
      project_checkin_reminders: 'push',
      project_checkout_reminders: 'push',
    };
    
    await updatePreferences({
      delivery_methods: {
        ...currentMethods,
        [key]: method,
      },
    } as any);
  };

  const handleQuietHoursChange = async (updates: any) => {
    await updatePreferences(updates);
  };

  const getDeliveryMethod = (key: string): 'push' | 'email' | 'both' => {
    const methods = preferences?.delivery_methods || {
      checkout_reminders: 'push',
      team_checkins: 'push',
      approvals_needed: 'push',
      approval_confirmed: 'push',
      ata_updates: 'push',
      diary_updates: 'push',
      weekly_summary: 'push',
      project_checkin_reminders: 'push',
      project_checkout_reminders: 'push',
    };
    return (methods[key as keyof typeof methods] || 'push') as 'push' | 'email' | 'both';
  };

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test notification');
      }

      toast.success('Testnotis skickad! Kontrollera din enhet.');
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte skicka testnotis');
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-yellow-300 mb-2">
          Push-notiser stöds inte
        </h3>
        <p className="text-gray-600 dark:text-yellow-200">
          Din webbläsare eller enhet stöder inte push-notiser. Prova att öppna EP-Tracker i Chrome, Firefox eller Safari.
        </p>
      </div>
    );
  }

  // Show push notification warning if denied, but still allow email notifications
  const showPushWarning = permission === 'denied';

  // If permission is default and no subscription, show enable banner
  // But if permission is denied, we still show settings (email can work)
  if ((permission === 'default' || !hasActiveSubscription) && !showPushWarning) {
    return <EnableNotificationsBanner onEnable={requestPermission} isLoading={permissionLoading} />;
  }

  if (prefsLoading || !preferences) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-white">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Warning (if denied) */}
      {showPushWarning && (
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                Push-notiser blockerade
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200 mb-3">
                Din webbläsare har blockerat push-notiser. Du kan fortfarande aktivera email-notiser nedan.
              </p>
              <details className="text-xs text-yellow-600 dark:text-yellow-200">
                <summary className="cursor-pointer font-medium mb-2">Hur aktiverar jag push-notiser?</summary>
                <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                  <li><strong>Chrome/Edge:</strong> Klicka på låsikonen i adressfältet → Webbplatsinställningar → Notiser → Tillåt</li>
                  <li><strong>Firefox:</strong> Klicka på skölden i adressfältet → Behörigheter → Notiser → Tillåt</li>
                  <li><strong>Safari:</strong> Safari → Inställningar → Webbplatser → Notiser → Tillåt för denna webbplats</li>
                </ul>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={async () => {
                      const currentPermission = Notification.permission;
                      if (currentPermission === 'denied') {
                        toast.error(
                          'Du måste först ändra inställningarna i din webbläsare (se instruktionerna ovan) och sedan klicka på "Uppdatera sida".',
                          { duration: 6000 }
                        );
                        return;
                      }
                      const result = await requestPermission();
                      if (!result) {
                        toast.error('Kunde inte aktivera push-notiser. Följ instruktionerna ovan.', { duration: 6000 });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                    disabled={permissionLoading}
                  >
                    {permissionLoading ? 'Försöker...' : 'Försök igen'}
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    size="sm"
                    className="border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                  >
                    Uppdatera sida
                  </Button>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner (if push is enabled) */}
      {!showPushWarning && hasActiveSubscription && (
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-300">Notiser aktiverade</h3>
              <p className="text-sm text-green-700 dark:text-green-200">Du får nu push-notiser från EP-Tracker</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Notification Button */}
      <div className="flex gap-3" data-tour="test-notification">
        <Button onClick={handleTestNotification} variant="outline" className="flex-1">
          <Send className="h-4 w-4 mr-2" />
          Skicka testnotis
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/notifications/history" data-tour="notification-history">
            Historik
          </Link>
        </Button>
      </div>

      {/* Notification Types */}
      <div className="space-y-4" data-tour="notification-types">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notis-typer</h3>

        <NotificationToggle
          icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          label="Check-in påminnelser"
          description="Påminnelse att checka in innan arbetsdagen börjar"
          checked={preferences.project_checkin_reminders}
          onToggle={(val) => handleToggle('project_checkin_reminders', val)}
          deliveryMethod={getDeliveryMethod('project_checkin_reminders')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('project_checkin_reminders', method)}
          preferenceKey="project_checkin_reminders"
        />

        <NotificationToggle
          icon={<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          label="Check-out påminnelser"
          description="Påminnelse att checka ut i slutet av arbetsdagen"
          checked={preferences.checkout_reminders}
          onToggle={(val) => handleToggle('checkout_reminders', val)}
          deliveryMethod={getDeliveryMethod('checkout_reminders')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('checkout_reminders', method)}
          preferenceKey="checkout_reminders"
        />

        <NotificationToggle
          icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          label="Team check-ins"
          description="Se när ditt team checkar in och ut"
          checked={preferences.team_checkins}
          onToggle={(val) => handleToggle('team_checkins', val)}
          deliveryMethod={getDeliveryMethod('team_checkins')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('team_checkins', method)}
          preferenceKey="team_checkins"
        />

        {canApprove && (
          <NotificationToggle
            icon={<CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />}
            label="Godkännanden väntar"
            description="Notis när tidrapporter behöver godkännas"
            checked={preferences.approvals_needed}
            onToggle={(val) => handleToggle('approvals_needed', val)}
            deliveryMethod={getDeliveryMethod('approvals_needed')}
            onDeliveryMethodChange={(method) => handleDeliveryMethodChange('approvals_needed', method)}
            preferenceKey="approvals_needed"
          />
        )}

        <NotificationToggle
          icon={<CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />}
          label="Din rapport godkänd"
          description="Notis när din tidrapport har godkänts"
          checked={preferences.approval_confirmed}
          onToggle={(val) => handleToggle('approval_confirmed', val)}
          deliveryMethod={getDeliveryMethod('approval_confirmed')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('approval_confirmed', method)}
          preferenceKey="approval_confirmed"
        />

        <NotificationToggle
          icon={<FileEdit className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
          label="ÄTA-uppdateringar"
          description="Nya ÄTA på dina projekt"
          checked={preferences.ata_updates}
          onToggle={(val) => handleToggle('ata_updates', val)}
          deliveryMethod={getDeliveryMethod('ata_updates')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('ata_updates', method)}
          preferenceKey="ata_updates"
        />

        <NotificationToggle
          icon={<BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
          label="Dagboksinlägg"
          description="Nya dagboksinlägg på dina projekt"
          checked={preferences.diary_updates}
          onToggle={(val) => handleToggle('diary_updates', val)}
          deliveryMethod={getDeliveryMethod('diary_updates')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('diary_updates', method)}
          preferenceKey="diary_updates"
        />

        <NotificationToggle
          icon={<TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          label="Veckosammanfattning"
          description="Sammanfattning av din arbetsvecka (fredag kväll)"
          checked={preferences.weekly_summary}
          onToggle={(val) => handleToggle('weekly_summary', val)}
          deliveryMethod={getDeliveryMethod('weekly_summary')}
          onDeliveryMethodChange={(method) => handleDeliveryMethodChange('weekly_summary', method)}
          preferenceKey="weekly_summary"
        />
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tyst läge</h3>
        <QuietHoursSelector
          enabled={preferences.quiet_hours_enabled}
          start={preferences.quiet_hours_start}
          end={preferences.quiet_hours_end}
          onEnabledChange={(val) => handleQuietHoursChange({ quiet_hours_enabled: val })}
          onStartChange={(val) => handleQuietHoursChange({ quiet_hours_start: val })}
          onEndChange={(val) => handleQuietHoursChange({ quiet_hours_end: val })}
        />
      </div>

      {/* Disable All */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="outline"
          className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={async () => {
            if (confirm('Är du säker på att du vill inaktivera alla notiser?')) {
              try {
                await fetch('/api/notifications/unsubscribe', { method: 'POST' });
                toast.success('Notiser inaktiverade');
                window.location.reload();
              } catch (error) {
                toast.error('Kunde inte inaktivera notiser');
              }
            }
          }}
        >
          Inaktivera alla notiser
        </Button>
      </div>
    </div>
  );
}

