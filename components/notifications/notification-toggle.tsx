/**
 * Toggle switch for individual notification types
 */

'use client';

import { Switch } from '@/components/ui/switch';

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  icon?: React.ReactNode;
}

export function NotificationToggle({
  label,
  description,
  checked,
  onToggle,
  icon,
}: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />
    </div>
  );
}

