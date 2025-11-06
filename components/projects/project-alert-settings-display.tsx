'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProjectAlertSettings } from './project-alert-settings';
import { Bell, Clock, AlertTriangle, Check, X, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AlertSettings {
  work_day_start: string;
  work_day_end: string;
  notify_on_checkin: boolean;
  notify_on_checkout: boolean;
  checkin_reminder_enabled: boolean;
  checkin_reminder_minutes_before: number;
  checkin_reminder_for_workers?: boolean;
  checkin_reminder_for_foreman?: boolean;
  checkin_reminder_for_admin?: boolean;
  checkout_reminder_enabled: boolean;
  checkout_reminder_minutes_before: number;
  checkout_reminder_for_workers?: boolean;
  checkout_reminder_for_foreman?: boolean;
  checkout_reminder_for_admin?: boolean;
  late_checkin_enabled: boolean;
  late_checkin_minutes_after: number;
  forgotten_checkout_enabled: boolean;
  forgotten_checkout_minutes_after: number;
  alert_recipients: string[];
}

interface ProjectAlertSettingsDisplayProps {
  alertSettings?: AlertSettings | null;
  projectId?: string;
  canEdit?: boolean;
}

const defaultAlertSettings: AlertSettings = {
  work_day_start: '07:00',
  work_day_end: '16:00',
  notify_on_checkin: true,
  notify_on_checkout: true,
  checkin_reminder_enabled: true,
  checkin_reminder_minutes_before: 15,
  checkin_reminder_for_workers: true,
  checkin_reminder_for_foreman: true,
  checkin_reminder_for_admin: true,
  checkout_reminder_enabled: true,
  checkout_reminder_minutes_before: 15,
  checkout_reminder_for_workers: true,
  checkout_reminder_for_foreman: true,
  checkout_reminder_for_admin: true,
  late_checkin_enabled: false,
  late_checkin_minutes_after: 15,
  forgotten_checkout_enabled: false,
  forgotten_checkout_minutes_after: 30,
  alert_recipients: ['admin', 'foreman'],
};

export function ProjectAlertSettingsDisplay({ alertSettings, projectId, canEdit = false }: ProjectAlertSettingsDisplayProps) {
  const settings = alertSettings || defaultAlertSettings;
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Normalize settings to ensure all required fields are present
  const normalizeSettings = (settings: AlertSettings): AlertSettings => {
    return {
      ...defaultAlertSettings,
      ...settings,
      // Ensure all boolean fields are defined
      checkin_reminder_for_workers: settings.checkin_reminder_for_workers ?? defaultAlertSettings.checkin_reminder_for_workers,
      checkin_reminder_for_foreman: settings.checkin_reminder_for_foreman ?? defaultAlertSettings.checkin_reminder_for_foreman,
      checkin_reminder_for_admin: settings.checkin_reminder_for_admin ?? defaultAlertSettings.checkin_reminder_for_admin,
      checkout_reminder_for_workers: settings.checkout_reminder_for_workers ?? defaultAlertSettings.checkout_reminder_for_workers,
      checkout_reminder_for_foreman: settings.checkout_reminder_for_foreman ?? defaultAlertSettings.checkout_reminder_for_foreman,
      checkout_reminder_for_admin: settings.checkout_reminder_for_admin ?? defaultAlertSettings.checkout_reminder_for_admin,
    };
  };
  
  const [editSettings, setEditSettings] = useState<AlertSettings>(normalizeSettings(settings));
  const [isSaving, setIsSaving] = useState(false);

  // Helper to calculate time with offset
  const calculateTime = (timeString: string, offsetMinutes: number): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + offsetMinutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const StatusIcon = ({ enabled }: { enabled: boolean }) => (
    enabled ? (
      <Check className="w-4 h-4 text-green-600" />
    ) : (
      <X className="w-4 h-4 text-gray-400" />
    )
  );

  const handleOpenEdit = () => {
    setEditSettings(normalizeSettings(settings));
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_settings: editSettings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert settings');
      }

      toast.success('Alert-inställningar uppdaterade');
      setIsEditDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating alert settings:', error);
      toast.error('Misslyckades att uppdatera alert-inställningar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alert-inställningar
              </CardTitle>
              <CardDescription>
                Notifieringar och påminnelser för detta projekt
              </CardDescription>
            </div>
            {canEdit && projectId && (
              <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Redigera
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Work Day Times */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
          <Clock className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-900">Arbetsdag</p>
            <p className="text-sm text-gray-600">
              Starttid: <span className="font-semibold">{settings.work_day_start}</span>
              {' • '}
              Sluttid: <span className="font-semibold">{settings.work_day_end}</span>
            </p>
          </div>
        </div>

        {/* Real-time Notifications */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700">
            Real-time notifieringar (till Admin/Arbetsledare)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.notify_on_checkin} />
                <div>
                  <p className="text-sm font-medium">Notifiera vid check-in</p>
                  <p className="text-xs text-gray-500">Skickas när arbetare checkar in</p>
                </div>
              </div>
              <Badge variant={settings.notify_on_checkin ? 'default' : 'secondary'}>
                {settings.notify_on_checkin ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.notify_on_checkout} />
                <div>
                  <p className="text-sm font-medium">Notifiera vid check-out</p>
                  <p className="text-xs text-gray-500">Skickas när arbetare checkar ut</p>
                </div>
              </div>
              <Badge variant={settings.notify_on_checkout ? 'default' : 'secondary'}>
                {settings.notify_on_checkout ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Påminnelser
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.checkin_reminder_enabled} />
                <div>
                  <p className="text-sm font-medium">Check-in påminnelse</p>
                  {settings.checkin_reminder_enabled && (
                    <p className="text-xs text-gray-500">
                      {settings.checkin_reminder_minutes_before} minuter före {settings.work_day_start}
                      {' ('}kl {calculateTime(settings.work_day_start, -settings.checkin_reminder_minutes_before)}{')'}
                      {settings.checkin_reminder_enabled && (
                        <span className="ml-2">
                          • Till: {[
                            settings.checkin_reminder_for_workers !== false && 'Arbetare',
                            settings.checkin_reminder_for_foreman !== false && 'Arbetsledare',
                            settings.checkin_reminder_for_admin !== false && 'Admin'
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={settings.checkin_reminder_enabled ? 'default' : 'secondary'}>
                {settings.checkin_reminder_enabled ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.checkout_reminder_enabled} />
                <div>
                  <p className="text-sm font-medium">Check-out påminnelse</p>
                  {settings.checkout_reminder_enabled && (
                    <p className="text-xs text-gray-500">
                      {settings.checkout_reminder_minutes_before} minuter före {settings.work_day_end}
                      {' ('}kl {calculateTime(settings.work_day_end, -settings.checkout_reminder_minutes_before)}{')'}
                      {settings.checkout_reminder_enabled && (
                        <span className="ml-2">
                          • Till: {[
                            settings.checkout_reminder_for_workers !== false && 'Arbetare',
                            settings.checkout_reminder_for_foreman !== false && 'Arbetsledare',
                            settings.checkout_reminder_for_admin !== false && 'Admin'
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={settings.checkout_reminder_enabled ? 'default' : 'secondary'}>
                {settings.checkout_reminder_enabled ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts to Admin/Foreman */}
        <div>
          <h4 className="font-medium mb-3 text-sm text-gray-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Varningar (till Admin/Arbetsledare)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.late_checkin_enabled} />
                <div>
                  <p className="text-sm font-medium">Varna om sen check-in</p>
                  {settings.late_checkin_enabled && (
                    <p className="text-xs text-gray-500">
                      {settings.late_checkin_minutes_after} minuter efter {settings.work_day_start}
                      {' ('}kl {calculateTime(settings.work_day_start, settings.late_checkin_minutes_after)}{')'}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={settings.late_checkin_enabled ? 'default' : 'secondary'}>
                {settings.late_checkin_enabled ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon enabled={settings.forgotten_checkout_enabled} />
                <div>
                  <p className="text-sm font-medium">Varna om glömt check-out</p>
                  {settings.forgotten_checkout_enabled && (
                    <p className="text-xs text-gray-500">
                      {settings.forgotten_checkout_minutes_after} minuter efter {settings.work_day_end}
                      {' ('}kl {calculateTime(settings.work_day_end, settings.forgotten_checkout_minutes_after)}{')'}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={settings.forgotten_checkout_enabled ? 'default' : 'secondary'}>
                {settings.forgotten_checkout_enabled ? 'Aktiverad' : 'Inaktiverad'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alert Recipients */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Vem får notiser?</p>
          <p className="text-sm text-blue-700">
            {settings.alert_recipients.includes('admin') && 'Administratörer'}
            {settings.alert_recipients.includes('admin') && settings.alert_recipients.includes('foreman') && ' och '}
            {settings.alert_recipients.includes('foreman') && 'Arbetsledare'}
          </p>
        </div>
      </CardContent>
    </Card>

    {/* Edit Alert Settings Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera Alert-inställningar</DialogTitle>
          <DialogDescription>
            Konfigurera notifieringar och påminnelser för detta projekt
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ProjectAlertSettings
            settings={editSettings}
            onChange={setEditSettings}
            disabled={isSaving}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(false)}
            disabled={isSaving}
          >
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Spara ändringar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

