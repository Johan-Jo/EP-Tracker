/**
 * Hook for managing notification preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export interface DeliveryMethods {
  checkout_reminders: 'push' | 'email' | 'both';
  team_checkins: 'push' | 'email' | 'both';
  approvals_needed: 'push' | 'email' | 'both';
  approval_confirmed: 'push' | 'email' | 'both';
  ata_updates: 'push' | 'email' | 'both';
  diary_updates: 'push' | 'email' | 'both';
  weekly_summary: 'push' | 'email' | 'both';
  project_checkin_reminders: 'push' | 'email' | 'both';
  project_checkout_reminders: 'push' | 'email' | 'both';
}

export interface NotificationPreferences {
  checkout_reminders: boolean;
  team_checkins: boolean;
  approvals_needed: boolean;
  approval_confirmed: boolean;
  ata_updates: boolean;
  diary_updates: boolean;
  weekly_summary: boolean;
  project_checkin_reminders: boolean;
  project_checkout_reminders: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  delivery_methods?: DeliveryMethods;
}

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('[Preferences] Error fetching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data);
      toast.success('Inställningar sparade');
      return true;
    } catch (error) {
      console.error('[Preferences] Error updating:', error);
      toast.error('Kunde inte spara inställningar');
      return false;
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    await fetchPreferences();
  };

  return {
    preferences,
    isLoading,
    updatePreferences,
    refresh,
  };
}

