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

export function NotificationSettings() {
  const { permission, isSupported, isLoading: permissionLoading, requestPermission, hasActiveSubscription } = useNotificationPermission();
  const { preferences, isLoading: prefsLoading, updatePreferences } = useNotificationPreferences();

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value } as any);
  };

  const handleQuietHoursChange = async (updates: any) => {
    await updatePreferences(updates);
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
      <div className="rounded-xl bg-yellow-50 border-2 border-yellow-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Push-notiser stöds inte
        </h3>
        <p className="text-gray-600">
          Din webbläsare eller enhet stöder inte push-notiser. Prova att öppna EP-Tracker i Chrome, Firefox eller Safari.
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="rounded-xl bg-red-50 border-2 border-red-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Notiser blockerade
        </h3>
        <p className="text-gray-600 mb-4">
          Du har blockerat notiser för EP-Tracker. För att aktivera notiser igen, ändra inställningarna i din webbläsare:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>Chrome/Edge: Klicka på låsikonen i adressfältet → Webbplatsinställningar</li>
          <li>Firefox: Klicka på skölden i adressfältet → Behörigheter</li>
          <li>Safari: Safari → Inställningar → Webbplatser → Notiser</li>
        </ul>
      </div>
    );
  }

  if (permission === 'default' || !hasActiveSubscription) {
    return <EnableNotificationsBanner onEnable={requestPermission} isLoading={permissionLoading} />;
  }

  if (prefsLoading || !preferences) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Bell className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Notiser aktiverade</h3>
            <p className="text-sm text-green-700">Du får nu push-notiser från EP-Tracker</p>
          </div>
        </div>
      </div>

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
        <h3 className="text-lg font-semibold text-gray-900">Notis-typer</h3>

        <NotificationToggle
          icon={<Clock className="h-5 w-5 text-orange-600" />}
          label="Check-out påminnelser"
          description="Påminnelse att checka ut i slutet av arbetsdagen"
          checked={preferences.checkout_reminders}
          onToggle={(val) => handleToggle('checkout_reminders', val)}
        />

        <NotificationToggle
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Team check-ins"
          description="Se när ditt team checkar in och ut"
          checked={preferences.team_checkins}
          onToggle={(val) => handleToggle('team_checkins', val)}
        />

        <NotificationToggle
          icon={<CheckSquare className="h-5 w-5 text-green-600" />}
          label="Godkännanden väntar"
          description="Notis när tidrapporter behöver godkännas"
          checked={preferences.approvals_needed}
          onToggle={(val) => handleToggle('approvals_needed', val)}
        />

        <NotificationToggle
          icon={<CheckSquare className="h-5 w-5 text-green-600" />}
          label="Din rapport godkänd"
          description="Notis när din tidrapport har godkänts"
          checked={preferences.approval_confirmed}
          onToggle={(val) => handleToggle('approval_confirmed', val)}
        />

        <NotificationToggle
          icon={<FileEdit className="h-5 w-5 text-purple-600" />}
          label="ÄTA-uppdateringar"
          description="Nya ÄTA på dina projekt"
          checked={preferences.ata_updates}
          onToggle={(val) => handleToggle('ata_updates', val)}
        />

        <NotificationToggle
          icon={<BookOpen className="h-5 w-5 text-indigo-600" />}
          label="Dagboksinlägg"
          description="Nya dagboksinlägg på dina projekt"
          checked={preferences.diary_updates}
          onToggle={(val) => handleToggle('diary_updates', val)}
        />

        <NotificationToggle
          icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
          label="Veckosammanfattning"
          description="Sammanfattning av din arbetsvecka (fredag kväll)"
          checked={preferences.weekly_summary}
          onToggle={(val) => handleToggle('weekly_summary', val)}
        />
      </div>

      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tyst läge</h3>
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
      <div className="pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          className="text-red-600 border-red-300 hover:bg-red-50"
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

