/**
 * Selector for quiet hours (when notifications are disabled)
 */

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface QuietHoursSelectorProps {
  enabled: boolean;
  start: string;
  end: string;
  onEnabledChange: (enabled: boolean) => void;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
}

export function QuietHoursSelector({
  enabled,
  start,
  end,
  onEnabledChange,
  onStartChange,
  onEndChange,
}: QuietHoursSelectorProps) {
  return (
    <div className="p-4 rounded-lg border border-gray-200" data-tour="quiet-hours">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium text-gray-900">Tyst läge</h4>
          <p className="text-sm text-gray-600 mt-1">
            Inga notiser under dessa tider
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <Label htmlFor="quiet-start" className="text-sm font-medium text-gray-700">
              Från
            </Label>
            <Input
              id="quiet-start"
              type="time"
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="quiet-end" className="text-sm font-medium text-gray-700">
              Till
            </Label>
            <Input
              id="quiet-end"
              type="time"
              value={end}
              onChange={(e) => onEndChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

