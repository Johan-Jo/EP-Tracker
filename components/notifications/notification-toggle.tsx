/**
 * Toggle switch for individual notification types
 */

'use client';

import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail } from 'lucide-react';

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  icon?: React.ReactNode;
  deliveryMethod?: 'push' | 'email' | 'both';
  onDeliveryMethodChange?: (method: 'push' | 'email' | 'both') => void;
  preferenceKey?: string;
}

export function NotificationToggle({
  label,
  description,
  checked,
  onToggle,
  icon,
  deliveryMethod = 'push',
  onDeliveryMethodChange,
  preferenceKey,
}: NotificationToggleProps) {
  const getDeliveryMethodLabel = (method: 'push' | 'email' | 'both') => {
    switch (method) {
      case 'push':
        return 'Push';
      case 'email':
        return 'Email';
      case 'both':
        return 'Båda';
      default:
        return 'Push';
    }
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {icon && (
            <div className="flex-shrink-0 mt-1">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
            <p className="text-sm text-gray-600 dark:text-white mt-1">{description}</p>
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onToggle}
          className="flex-shrink-0"
        />
      </div>
      
      {checked && onDeliveryMethodChange && preferenceKey && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-600 dark:text-white flex items-center gap-1">
            <Bell className="h-3 w-3" />
            Leveransmetod:
          </span>
          <Select
            value={deliveryMethod}
            onValueChange={(value) => onDeliveryMethodChange(value as 'push' | 'email' | 'both')}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue>{getDeliveryMethodLabel(deliveryMethod)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="push">
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  Push
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  <Mail className="h-3 w-3" />
                  Båda
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

