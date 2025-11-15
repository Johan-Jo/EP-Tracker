/**
 * Project Alert Settings Component
 * Allows admins/foremen to configure project-specific alerts
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Bell, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface ProjectAlertSettings {
  work_day_start: string;
  work_day_end: string;
  checkin_reminder_enabled: boolean;
  checkin_reminder_minutes_before: number;
  checkout_reminder_enabled: boolean;
  checkout_reminder_minutes_before: number;
  late_checkin_alert_enabled: boolean;
  late_checkin_alert_minutes_after: number;
  forgotten_checkout_alert_enabled: boolean;
  forgotten_checkout_alert_minutes_after: number;
  alert_recipients: string[];
}

interface ProjectAlertSettingsProps {
  projectId: string;
  initialSettings?: Partial<ProjectAlertSettings>;
  onSave?: (settings: ProjectAlertSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: ProjectAlertSettings = {
  work_day_start: '07:00',
  work_day_end: '16:00',
  checkin_reminder_enabled: true,
  checkin_reminder_minutes_before: 15,
  checkout_reminder_enabled: true,
  checkout_reminder_minutes_before: 15,
  late_checkin_alert_enabled: true,
  late_checkin_alert_minutes_after: 15,
  forgotten_checkout_alert_enabled: true,
  forgotten_checkout_alert_minutes_after: 30,
  alert_recipients: ['foreman', 'admin'],
};

export function ProjectAlertSettings({
  projectId,
  initialSettings,
  onSave,
}: ProjectAlertSettingsProps) {
  const [settings, setSettings] = useState<ProjectAlertSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = <K extends keyof ProjectAlertSettings>(
    key: K,
    value: ProjectAlertSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(settings);
      } else {
        // Default save implementation
        const response = await fetch(`/api/projects/${projectId}/alert-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alert_settings: settings }),
        });

        if (!response.ok) {
          throw new Error('Failed to save alert settings');
        }
      }

      toast.success('Alert-inställningar sparade');
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte spara inställningar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Work Day Times */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Arbetstider</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="work_day_start">Arbetsdag startar</Label>
            <Input
              id="work_day_start"
              type="time"
              value={settings.work_day_start}
              onChange={(e) => updateSetting('work_day_start', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="work_day_end">Arbetsdag slutar</Label>
            <Input
              id="work_day_end"
              type="time"
              value={settings.work_day_end}
              onChange={(e) => updateSetting('work_day_end', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Check-in Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Incheckningspåminnelse</h3>
          </div>
          <Switch
            checked={settings.checkin_reminder_enabled}
            onCheckedChange={(val) => updateSetting('checkin_reminder_enabled', val)}
          />
        </div>
        {settings.checkin_reminder_enabled && (
          <div>
            <Label htmlFor="checkin_minutes">Minuter innan arbetsdag</Label>
            <Input
              id="checkin_minutes"
              type="number"
              min="0"
              max="60"
              value={settings.checkin_reminder_minutes_before}
              onChange={(e) =>
                updateSetting('checkin_reminder_minutes_before', parseInt(e.target.value))
              }
            />
            <p className="text-xs text-gray-600 mt-1">
              Påminner arbetare att checka in {settings.checkin_reminder_minutes_before} minuter innan
              arbetsdag startar
            </p>
          </div>
        )}
      </Card>

      {/* Check-out Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Utcheckningspåminnelse</h3>
          </div>
          <Switch
            checked={settings.checkout_reminder_enabled}
            onCheckedChange={(val) => updateSetting('checkout_reminder_enabled', val)}
          />
        </div>
        {settings.checkout_reminder_enabled && (
          <div>
            <Label htmlFor="checkout_minutes">Minuter innan arbetsdag slutar</Label>
            <Input
              id="checkout_minutes"
              type="number"
              min="0"
              max="60"
              value={settings.checkout_reminder_minutes_before}
              onChange={(e) =>
                updateSetting('checkout_reminder_minutes_before', parseInt(e.target.value))
              }
            />
            <p className="text-xs text-gray-600 mt-1">
              Påminner arbetare att checka ut {settings.checkout_reminder_minutes_before} minuter
              innan arbetsdag slutar
            </p>
          </div>
        )}
      </Card>

      {/* Late Check-in Alerts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Sen incheckningsvarning</h3>
          </div>
          <Switch
            checked={settings.late_checkin_alert_enabled}
            onCheckedChange={(val) => updateSetting('late_checkin_alert_enabled', val)}
          />
        </div>
        {settings.late_checkin_alert_enabled && (
          <div>
            <Label htmlFor="late_checkin_minutes">Minuter efter arbetsdag startat</Label>
            <Input
              id="late_checkin_minutes"
              type="number"
              min="0"
              max="120"
              value={settings.late_checkin_alert_minutes_after}
              onChange={(e) =>
                updateSetting('late_checkin_alert_minutes_after', parseInt(e.target.value))
              }
            />
            <p className="text-xs text-gray-600 mt-1">
              Varnar arbetsledare om arbetare inte checkat in{' '}
              {settings.late_checkin_alert_minutes_after} minuter efter arbetsdag startat
            </p>
          </div>
        )}
      </Card>

      {/* Forgotten Check-out Alerts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Glömt utcheckningsvarning</h3>
          </div>
          <Switch
            checked={settings.forgotten_checkout_alert_enabled}
            onCheckedChange={(val) => updateSetting('forgotten_checkout_alert_enabled', val)}
          />
        </div>
        {settings.forgotten_checkout_alert_enabled && (
          <div>
            <Label htmlFor="forgotten_checkout_minutes">Minuter efter arbetsdag slutat</Label>
            <Input
              id="forgotten_checkout_minutes"
              type="number"
              min="0"
              max="120"
              value={settings.forgotten_checkout_alert_minutes_after}
              onChange={(e) =>
                updateSetting('forgotten_checkout_alert_minutes_after', parseInt(e.target.value))
              }
            />
            <p className="text-xs text-gray-600 mt-1">
              Varnar arbetsledare om arbetare inte checkat ut{' '}
              {settings.forgotten_checkout_alert_minutes_after} minuter efter arbetsdag slutat
            </p>
          </div>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Sparar...' : 'Spara inställningar'}
        </Button>
      </div>
    </div>
  );
}

