'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProjectAlertSettings } from './project-alert-settings';
import { Bell, Clock, AlertTriangle, Check, X, Edit2, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AlertSettings as SchemaAlertSettings } from '@/lib/schemas/project';

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
  onSaveSuccess?: (savedSettings: AlertSettings) => void;
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

export function ProjectAlertSettingsDisplay({ alertSettings, projectId, canEdit = false, onSaveSuccess }: ProjectAlertSettingsDisplayProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Normalize settings to ensure all required fields are present
  const normalizeSettings = (settings: AlertSettings): SchemaAlertSettings => {
    return {
      ...defaultAlertSettings,
      ...settings,
      // Ensure all boolean fields are defined
      checkin_reminder_for_workers: settings.checkin_reminder_for_workers ?? defaultAlertSettings.checkin_reminder_for_workers ?? true,
      checkin_reminder_for_foreman: settings.checkin_reminder_for_foreman ?? defaultAlertSettings.checkin_reminder_for_foreman ?? true,
      checkin_reminder_for_admin: settings.checkin_reminder_for_admin ?? defaultAlertSettings.checkin_reminder_for_admin ?? true,
      checkout_reminder_for_workers: settings.checkout_reminder_for_workers ?? defaultAlertSettings.checkout_reminder_for_workers ?? true,
      checkout_reminder_for_foreman: settings.checkout_reminder_for_foreman ?? defaultAlertSettings.checkout_reminder_for_foreman ?? true,
      checkout_reminder_for_admin: settings.checkout_reminder_for_admin ?? defaultAlertSettings.checkout_reminder_for_admin ?? true,
    };
  };
  
  // Use state for settings so it can be updated when prop changes
  const [settings, setSettings] = useState<SchemaAlertSettings>(normalizeSettings(alertSettings || defaultAlertSettings));
  const [editSettings, setEditSettings] = useState<SchemaAlertSettings>(normalizeSettings(alertSettings || defaultAlertSettings));
  const [isSaving, setIsSaving] = useState(false);

  // Update settings and editSettings when alertSettings prop changes (e.g., after save and refresh)
  useEffect(() => {
    if (alertSettings) {
      const normalized = normalizeSettings(alertSettings);
      setSettings(normalized);
      setEditSettings(normalized);
      console.log('[ProjectAlertSettingsDisplay] Updated settings from prop:', normalized);
    }
  }, [alertSettings]);

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
    if (!projectId) {
      console.error('[ProjectAlertSettingsDisplay] No projectId provided');
      toast.error('Projekt-ID saknas');
      return;
    }

    console.log('[ProjectAlertSettingsDisplay] Saving alert settings for project:', projectId);
    console.log('[ProjectAlertSettingsDisplay] Settings to save:', editSettings);

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_settings: editSettings,
        }),
      });

      console.log('[ProjectAlertSettingsDisplay] Response status:', response.status);
      console.log('[ProjectAlertSettingsDisplay] Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ProjectAlertSettingsDisplay] Save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to update alert settings (${response.status})`);
      }

      const result = await response.json();
      console.log('[ProjectAlertSettingsDisplay] Save successful:', result);
      console.log('[ProjectAlertSettingsDisplay] Updated alert_settings:', result.project?.alert_settings);

      // Update local state with saved data
      if (result.project?.alert_settings) {
        const savedSettings = normalizeSettings(result.project.alert_settings);
        setEditSettings(savedSettings);
        
        // Notify parent component to update its state
        if (onSaveSuccess) {
          onSaveSuccess(result.project.alert_settings);
        }
      }

      // Show success toast
      toast.success('Alert-inställningar uppdaterade', {
        duration: 3000,
      });
      
      setIsEditDialogOpen(false);
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error: any) {
      console.error('[ProjectAlertSettingsDisplay] Error updating alert settings:', error);
      toast.error(error.message || 'Misslyckades att uppdatera alert-inställningar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Alert-inställningar
                    </CardTitle>
                    <CardDescription>
                      Notifieringar och påminnelser för detta projekt
                    </CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              {canEdit && projectId && (
                <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Redigera
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
        {/* Work Day Times */}
        <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">Arbetsdag</p>
            <p className="text-sm text-muted-foreground">
              Starttid: <span className="font-semibold">{settings.work_day_start}</span>
              {' • '}
              Sluttid: <span className="font-semibold">{settings.work_day_end}</span>
            </p>
          </div>
        </div>

        {/* Real-time Notifications */}
        <div>
          <h4 className="font-medium mb-3 text-sm">
            Real-time notifieringar (till Admin/Arbetsledare)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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

            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Påminnelser
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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

            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Varningar (till Admin/Arbetsledare)
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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

            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
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
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium mb-1">Vem får notiser?</p>
          <p className="text-sm text-muted-foreground">
            {settings.alert_recipients.includes('admin') && 'Administratörer'}
            {settings.alert_recipients.includes('admin') && settings.alert_recipients.includes('foreman') && ' och '}
            {settings.alert_recipients.includes('foreman') && 'Arbetsledare'}
          </p>
        </div>
      </CardContent>
          </CollapsibleContent>
        </Collapsible>
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

