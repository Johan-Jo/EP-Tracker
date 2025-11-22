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
  // For standalone page usage
  projectId?: string;
  initialSettings?: Partial<ProjectAlertSettings>;
  onSave?: (settings: ProjectAlertSettings) => Promise<void>;
  // For dialog/display usage
  settings?: Partial<ProjectAlertSettings>;
  onChange?: (settings: Partial<ProjectAlertSettings>) => void;
  disabled?: boolean;
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
  settings: controlledSettings,
  onChange,
  disabled = false,
}: ProjectAlertSettingsProps) {
  // Support both controlled (from display component) and uncontrolled (standalone page) usage
  const isControlled = controlledSettings !== undefined && onChange !== undefined;
  
  // Map between different schema formats
  const mapToProjectAlertSettings = (input: any): ProjectAlertSettings => {
    return {
      ...DEFAULT_SETTINGS,
      ...input,
      // Map schema field names to component field names
      late_checkin_alert_enabled: input.late_checkin_alert_enabled ?? input.late_checkin_enabled ?? DEFAULT_SETTINGS.late_checkin_alert_enabled,
      late_checkin_alert_minutes_after: input.late_checkin_alert_minutes_after ?? input.late_checkin_minutes_after ?? DEFAULT_SETTINGS.late_checkin_alert_minutes_after,
      forgotten_checkout_alert_enabled: input.forgotten_checkout_alert_enabled ?? input.forgotten_checkout_enabled ?? DEFAULT_SETTINGS.forgotten_checkout_alert_enabled,
      forgotten_checkout_alert_minutes_after: input.forgotten_checkout_alert_minutes_after ?? input.forgotten_checkout_minutes_after ?? DEFAULT_SETTINGS.forgotten_checkout_alert_minutes_after,
    };
  };

  const [internalSettings, setInternalSettings] = useState<ProjectAlertSettings>(
    mapToProjectAlertSettings({ ...initialSettings, ...controlledSettings })
  );

  // Use controlled settings if provided, otherwise use internal state
  const settings = isControlled 
    ? mapToProjectAlertSettings(controlledSettings) 
    : internalSettings;
  const [isSaving, setIsSaving] = useState(false);

  // Validate projectId only for standalone usage (when saving directly)
  if (!isControlled && !projectId) {
    console.error('[ProjectAlertSettings] projectId is required but was not provided');
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
        <p className="text-red-800 font-semibold">Fel: Projekt-ID saknas</p>
        <p className="text-red-600 text-sm mt-1">
          Ladda om sidan eller gå tillbaka till projektlistan.
        </p>
      </div>
    );
  }

  const updateSetting = <K extends keyof ProjectAlertSettings>(
    key: K,
    value: ProjectAlertSettings[K]
  ) => {
    if (isControlled && onChange) {
      // Controlled: notify parent with mapped field names
      const updated = { ...settings, [key]: value };
      // Map back to schema format - keep all fields but ensure schema field names exist
      const mapped: any = { ...updated };
      
      // Map component field names to schema field names (for compatibility)
      if (updated.late_checkin_alert_enabled !== undefined) {
        mapped.late_checkin_enabled = updated.late_checkin_alert_enabled;
      }
      if (updated.late_checkin_alert_minutes_after !== undefined) {
        mapped.late_checkin_minutes_after = updated.late_checkin_alert_minutes_after;
      }
      if (updated.forgotten_checkout_alert_enabled !== undefined) {
        mapped.forgotten_checkout_enabled = updated.forgotten_checkout_alert_enabled;
      }
      if (updated.forgotten_checkout_alert_minutes_after !== undefined) {
        mapped.forgotten_checkout_minutes_after = updated.forgotten_checkout_alert_minutes_after;
      }
      
      console.log('[ProjectAlertSettings] updateSetting - key:', key, 'value:', value);
      console.log('[ProjectAlertSettings] updateSetting - updated settings:', updated);
      console.log('[ProjectAlertSettings] updateSetting - mapped to schema:', mapped);
      
      onChange(mapped);
    } else {
      // Uncontrolled: update internal state
      setInternalSettings((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    // For controlled usage, saving is handled by parent component
    if (isControlled) {
      console.log('[ProjectAlertSettings] Controlled mode - save handled by parent');
      return;
    }

    if (!projectId) {
      toast.error('Projekt-ID saknas. Ladda om sidan och försök igen.');
      console.error('[ProjectAlertSettings] projectId is undefined');
      return;
    }

    // Use current settings state (either controlled or internal)
    const settingsToSave = isControlled ? settings : internalSettings;
    
    console.log('[ProjectAlertSettings] Saving settings for project:', projectId);
    console.log('[ProjectAlertSettings] isControlled:', isControlled);
    console.log('[ProjectAlertSettings] Settings to save:', settingsToSave);
    console.log('[ProjectAlertSettings] Current internalSettings:', internalSettings);
    console.log('[ProjectAlertSettings] Current settings:', settings);
    
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(settingsToSave);
      } else {
        // Default save implementation
        const url = `/api/projects/${projectId}/alert-settings`;
        const payload = { alert_settings: settingsToSave };
        
        console.log('[ProjectAlertSettings] Calling:', url);
        console.log('[ProjectAlertSettings] Payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        console.log('[ProjectAlertSettings] Response status:', response.status);
        console.log('[ProjectAlertSettings] Response ok:', response.ok);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[ProjectAlertSettings] Save failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || `Failed to save alert settings (${response.status})`);
        }

        const result = await response.json();
        console.log('[ProjectAlertSettings] Save successful:', result);
      }

      toast.success('Alert-inställningar sparade');
    } catch (error: any) {
      console.error('[ProjectAlertSettings] Error saving:', error);
      const errorMessage = error.message || 'Kunde inte spara inställningar';
      toast.error(errorMessage);
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
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="work_day_end">Arbetsdag slutar</Label>
            <Input
              id="work_day_end"
              type="time"
              value={settings.work_day_end}
              onChange={(e) => updateSetting('work_day_end', e.target.value)}
              disabled={disabled}
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
            disabled={disabled}
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
              value={settings.checkin_reminder_minutes_before || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateSetting('checkin_reminder_minutes_before', isNaN(value) ? 0 : value);
              }}
              disabled={disabled}
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
            disabled={disabled}
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
              value={settings.checkout_reminder_minutes_before || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateSetting('checkout_reminder_minutes_before', isNaN(value) ? 0 : value);
              }}
              disabled={disabled}
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
            disabled={disabled}
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
              value={settings.late_checkin_alert_minutes_after || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateSetting('late_checkin_alert_minutes_after', isNaN(value) ? 0 : value);
              }}
              disabled={disabled}
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
            disabled={disabled}
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
              value={settings.forgotten_checkout_alert_minutes_after || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                updateSetting('forgotten_checkout_alert_minutes_after', isNaN(value) ? 0 : value);
              }}
              disabled={disabled}
            />
            <p className="text-xs text-gray-600 mt-1">
              Varnar arbetsledare om arbetare inte checkat ut{' '}
              {settings.forgotten_checkout_alert_minutes_after} minuter efter arbetsdag slutat
            </p>
          </div>
        )}
      </Card>

      {/* Save Button - only show for standalone usage */}
      {!isControlled && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || disabled}>
            {isSaving ? 'Sparar...' : 'Spara inställningar'}
          </Button>
        </div>
      )}
    </div>
  );
}

