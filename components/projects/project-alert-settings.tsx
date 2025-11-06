'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, Bell, AlertTriangle } from 'lucide-react';
import type { AlertSettings } from '@/lib/schemas/project';

interface ProjectAlertSettingsProps {
  settings: AlertSettings;
  onChange: (settings: AlertSettings) => void;
  disabled?: boolean;
}

export function ProjectAlertSettings({ settings, onChange, disabled = false }: ProjectAlertSettingsProps) {
  const updateSetting = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alert-inställningar
        </CardTitle>
        <CardDescription>
          Konfigurera notifieringar för detta projekt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Work Day Times */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Arbetsdag
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work_day_start">Starttid</Label>
              <Input
                id="work_day_start"
                type="time"
                value={settings.work_day_start}
                onChange={(e) => updateSetting('work_day_start', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_day_end">Sluttid</Label>
              <Input
                id="work_day_end"
                type="time"
                value={settings.work_day_end}
                onChange={(e) => updateSetting('work_day_end', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Real-time Notifications to Admin/Foreman */}
        <div>
          <h4 className="font-medium mb-3">Real-time notifieringar (till Admin/Arbetsledare)</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_on_checkin">Notifiera vid check-in</Label>
                <p className="text-sm text-muted-foreground">
                  Skicka notis varje gång en arbetare checkar in
                </p>
              </div>
              <Switch
                id="notify_on_checkin"
                checked={settings.notify_on_checkin}
                onCheckedChange={(checked) => updateSetting('notify_on_checkin', checked)}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_on_checkout">Notifiera vid check-out</Label>
                <p className="text-sm text-muted-foreground">
                  Skicka notis varje gång en arbetare checkar ut
                </p>
              </div>
              <Switch
                id="notify_on_checkout"
                checked={settings.notify_on_checkout}
                onCheckedChange={(checked) => updateSetting('notify_on_checkout', checked)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Reminders to Workers, Foreman, and Admin */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Påminnelser
          </h4>
          <div className="space-y-6">
            {/* Check-in Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="checkin_reminder_enabled">Check-in påminnelse</Label>
                  <p className="text-sm text-muted-foreground">
                    Påminn användare att checka in före starttid
                  </p>
                </div>
                <Switch
                  id="checkin_reminder_enabled"
                  checked={settings.checkin_reminder_enabled}
                  onCheckedChange={(checked) => updateSetting('checkin_reminder_enabled', checked)}
                  disabled={disabled}
                />
              </div>
              {settings.checkin_reminder_enabled && (
                <div className="ml-6 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="checkin_reminder_minutes_before">Minuter före starttid</Label>
                    <Input
                      id="checkin_reminder_minutes_before"
                      type="number"
                      min="1"
                      max="120"
                      value={settings.checkin_reminder_minutes_before}
                      onChange={(e) =>
                        updateSetting('checkin_reminder_minutes_before', parseInt(e.target.value) || 15)
                      }
                      disabled={disabled}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 15 minuter före {settings.work_day_start} = påminnelse kl{' '}
                      {calculateTime(settings.work_day_start, -settings.checkin_reminder_minutes_before)}
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium">Skicka till:</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkin_reminder_for_workers" className="text-sm font-normal">
                          Arbetare
                        </Label>
                        <Switch
                          id="checkin_reminder_for_workers"
                          checked={settings.checkin_reminder_for_workers ?? true}
                          onCheckedChange={(checked) => updateSetting('checkin_reminder_for_workers', checked)}
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkin_reminder_for_foreman" className="text-sm font-normal">
                          Arbetsledare
                        </Label>
                        <Switch
                          id="checkin_reminder_for_foreman"
                          checked={settings.checkin_reminder_for_foreman ?? true}
                          onCheckedChange={(checked) => updateSetting('checkin_reminder_for_foreman', checked)}
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkin_reminder_for_admin" className="text-sm font-normal">
                          Admin
                        </Label>
                        <Switch
                          id="checkin_reminder_for_admin"
                          checked={settings.checkin_reminder_for_admin ?? true}
                          onCheckedChange={(checked) => updateSetting('checkin_reminder_for_admin', checked)}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Check-out Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="checkout_reminder_enabled">Check-out påminnelse</Label>
                  <p className="text-sm text-muted-foreground">
                    Påminn användare att checka ut före sluttid
                  </p>
                </div>
                <Switch
                  id="checkout_reminder_enabled"
                  checked={settings.checkout_reminder_enabled}
                  onCheckedChange={(checked) => updateSetting('checkout_reminder_enabled', checked)}
                  disabled={disabled}
                />
              </div>
              {settings.checkout_reminder_enabled && (
                <div className="ml-6 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="checkout_reminder_minutes_before">Minuter före sluttid</Label>
                    <Input
                      id="checkout_reminder_minutes_before"
                      type="number"
                      min="1"
                      max="120"
                      value={settings.checkout_reminder_minutes_before}
                      onChange={(e) =>
                        updateSetting('checkout_reminder_minutes_before', parseInt(e.target.value) || 15)
                      }
                      disabled={disabled}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 15 minuter före {settings.work_day_end} = påminnelse kl{' '}
                      {calculateTime(settings.work_day_end, -settings.checkout_reminder_minutes_before)}
                    </p>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium">Skicka till:</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkout_reminder_for_workers" className="text-sm font-normal">
                          Arbetare
                        </Label>
                        <Switch
                          id="checkout_reminder_for_workers"
                          checked={settings.checkout_reminder_for_workers ?? true}
                          onCheckedChange={(checked) => updateSetting('checkout_reminder_for_workers', checked)}
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkout_reminder_for_foreman" className="text-sm font-normal">
                          Arbetsledare
                        </Label>
                        <Switch
                          id="checkout_reminder_for_foreman"
                          checked={settings.checkout_reminder_for_foreman ?? true}
                          onCheckedChange={(checked) => updateSetting('checkout_reminder_for_foreman', checked)}
                          disabled={disabled}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="checkout_reminder_for_admin" className="text-sm font-normal">
                          Admin
                        </Label>
                        <Switch
                          id="checkout_reminder_for_admin"
                          checked={settings.checkout_reminder_for_admin ?? true}
                          onCheckedChange={(checked) => updateSetting('checkout_reminder_for_admin', checked)}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts to Admin/Foreman */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Varningar (till Admin/Arbetsledare)
          </h4>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="late_checkin_enabled">Varna om sen check-in</Label>
                  <p className="text-sm text-muted-foreground">
                    Varna om arbetare inte checkat in efter starttid
                  </p>
                </div>
                <Switch
                  id="late_checkin_enabled"
                  checked={settings.late_checkin_enabled}
                  onCheckedChange={(checked) => updateSetting('late_checkin_enabled', checked)}
                  disabled={disabled}
                />
              </div>
              {settings.late_checkin_enabled && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="late_checkin_minutes_after">Minuter efter starttid</Label>
                  <Input
                    id="late_checkin_minutes_after"
                    type="number"
                    min="1"
                    max="120"
                    value={settings.late_checkin_minutes_after}
                    onChange={(e) =>
                      updateSetting('late_checkin_minutes_after', parseInt(e.target.value) || 15)
                    }
                    disabled={disabled}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: 15 minuter efter {settings.work_day_start} = varning kl{' '}
                    {calculateTime(settings.work_day_start, settings.late_checkin_minutes_after)}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="forgotten_checkout_enabled">Varna om glömt check-out</Label>
                  <p className="text-sm text-muted-foreground">
                    Varna om arbetare inte checkat ut efter sluttid
                  </p>
                </div>
                <Switch
                  id="forgotten_checkout_enabled"
                  checked={settings.forgotten_checkout_enabled}
                  onCheckedChange={(checked) => updateSetting('forgotten_checkout_enabled', checked)}
                  disabled={disabled}
                />
              </div>
              {settings.forgotten_checkout_enabled && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="forgotten_checkout_minutes_after">Minuter efter sluttid</Label>
                  <Input
                    id="forgotten_checkout_minutes_after"
                    type="number"
                    min="1"
                    max="120"
                    value={settings.forgotten_checkout_minutes_after}
                    onChange={(e) =>
                      updateSetting('forgotten_checkout_minutes_after', parseInt(e.target.value) || 30)
                    }
                    disabled={disabled}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: 30 minuter efter {settings.work_day_end} = varning kl{' '}
                    {calculateTime(settings.work_day_end, settings.forgotten_checkout_minutes_after)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to calculate time with offset
function calculateTime(timeString: string, offsetMinutes: number): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + offsetMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

