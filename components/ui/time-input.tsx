'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function TimeInput({ value, onChange, label, disabled, className }: TimeInputProps) {
  const parseValue = (val: string) => {
    if (!val) return { hours: 0, minutes: 0 };
    const parts = val.split(':');
    return {
      hours: parseInt(parts[0] || '0') || 0,
      minutes: parseInt(parts[1] || '0') || 0,
    };
  };

  const [hours, setHours] = useState(() => parseValue(value).hours);
  const [minutes, setMinutes] = useState(() => parseValue(value).minutes);

  // Sync with external value changes
  useEffect(() => {
    const parsed = parseValue(value);
    setHours(parsed.hours);
    setMinutes(parsed.minutes);
  }, [value]);

  const currentHours = hours;
  const currentMinutes = minutes;

  const updateTime = (newHours: number, newMinutes: number) => {
    // Ensure valid ranges
    const h = Math.max(0, Math.min(23, newHours));
    const m = Math.max(0, Math.min(59, newMinutes));
    
    setHours(h);
    setMinutes(m);
    onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  const incrementHours = () => {
    updateTime(currentHours + 1, currentMinutes);
  };

  const decrementHours = () => {
    updateTime(currentHours - 1, currentMinutes);
  };

  const incrementMinutes = () => {
    const newMinutes = currentMinutes + 1; // Step by 1 minute
    if (newMinutes >= 60) {
      updateTime(currentHours + 1, newMinutes - 60);
    } else {
      updateTime(currentHours, newMinutes);
    }
  };

  const decrementMinutes = () => {
    const newMinutes = currentMinutes - 1; // Step by 1 minute
    if (newMinutes < 0) {
      updateTime(currentHours - 1, newMinutes + 60);
    } else {
      updateTime(currentHours, newMinutes);
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    updateTime(val, currentMinutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    updateTime(currentHours, val);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* Hours */}
        <div className="flex-1">
          <div className="flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-b-none rounded-t-lg border-b-0"
              onClick={incrementHours}
              disabled={disabled || currentHours >= 23}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="23"
              value={currentHours}
              onChange={handleHoursChange}
              disabled={disabled}
              className="h-14 text-center text-xl font-semibold rounded-none border-x-0 border-t-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-t-none rounded-b-lg border-t-0"
              onClick={decrementHours}
              disabled={disabled || currentHours <= 0}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
            <span className="text-xs text-muted-foreground mt-1">Tim</span>
          </div>
        </div>

        {/* Separator */}
        <div className="text-2xl font-bold text-muted-foreground pb-8">:</div>

        {/* Minutes */}
        <div className="flex-1">
          <div className="flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-b-none rounded-t-lg border-b-0"
              onClick={incrementMinutes}
              disabled={disabled}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={currentMinutes}
              onChange={handleMinutesChange}
              disabled={disabled}
              className="h-14 text-center text-xl font-semibold rounded-none border-x-0 border-t-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-t-none rounded-b-lg border-t-0"
              onClick={decrementMinutes}
              disabled={disabled || (currentHours === 0 && currentMinutes === 0)}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
            <span className="text-xs text-muted-foreground mt-1">Min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

