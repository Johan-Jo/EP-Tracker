'use client';

import { useState } from 'react';
import { Clock, Plus, Minus } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface TimePickerInputProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	className?: string;
	error?: string;
}

export function TimePickerInput({
	id,
	label,
	value,
	onChange,
	required = false,
	className,
	error,
}: TimePickerInputProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Parse current value (handle both HH:mm and HH:mm:ss formats)
	const parseTime = (timeStr: string) => {
		if (!timeStr) return [7, 0];
		const parts = timeStr.split(':');
		return [Number(parts[0]) || 7, Number(parts[1]) || 0];
	};

	const [hours, minutes] = value ? parseTime(value) : [7, 0];

	// Quick select times (common work hours)
	const quickTimes = [
		{ label: '06:00', value: '06:00' },
		{ label: '07:00', value: '07:00' },
		{ label: '08:00', value: '08:00' },
		{ label: '09:00', value: '09:00' },
		{ label: '12:00', value: '12:00' },
		{ label: '13:00', value: '13:00' },
		{ label: '14:00', value: '14:00' },
		{ label: '15:00', value: '15:00' },
		{ label: '16:00', value: '16:00' },
		{ label: '17:00', value: '17:00' },
	];

	const formatTime = (h: number, m: number) => {
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	};

	// Format value for display (remove seconds if present)
	const formatValueForDisplay = (val: string) => {
		if (!val) return 'Välj tid';
		// Remove seconds if present (HH:mm:ss -> HH:mm)
		return val.split(':').slice(0, 2).join(':');
	};

	const updateHours = (delta: number) => {
		const newHours = (hours + delta + 24) % 24;
		onChange(formatTime(newHours, minutes));
	};

	const updateMinutes = (delta: number) => {
		let newMinutes = minutes + delta;
		let newHours = hours;

		if (newMinutes >= 60) {
			newMinutes = newMinutes % 60;
			newHours = (hours + 1) % 24;
		} else if (newMinutes < 0) {
			newMinutes = 60 + newMinutes;
			newHours = (hours - 1 + 24) % 24;
		}

		onChange(formatTime(newHours, newMinutes));
	};

	const selectQuickTime = (time: string) => {
		onChange(time);
		setIsOpen(false);
	};

	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor={id} className="text-gray-700 dark:text-gray-300">
				{label} {required && <span className="text-destructive">*</span>}
			</Label>

			<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					className="flex h-14 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-left transition-all hover:border-orange-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-orange-500"
				>
					<span className="text-lg text-gray-900 dark:text-white">
						{formatValueForDisplay(value)}
					</span>
					<Clock className="h-5 w-5 text-gray-400" />
				</button>
			</PopoverTrigger>

				<PopoverContent
					className="w-80 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
					align="start"
				>
					<div className="space-y-4">
						{/* Time Adjustment Controls */}
						<div>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								Justera tid
							</p>
							<div className="grid grid-cols-2 gap-3">
								{/* Hours */}
								<div className="space-y-2">
									<Label className="text-xs text-gray-500 dark:text-gray-400">
										Timmar
									</Label>
									<div className="flex items-center justify-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => updateHours(-1)}
											className="h-10 w-10 rounded-lg border-gray-300 dark:border-gray-600"
										>
											<Minus className="h-4 w-4" />
										</Button>
										<div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl text-gray-900 dark:bg-gray-700 dark:text-white">
											{String(hours).padStart(2, '0')}
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => updateHours(1)}
											className="h-10 w-10 rounded-lg border-gray-300 dark:border-gray-600"
										>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
									<div className="flex justify-center gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => updateHours(-5)}
											className="h-7 text-xs"
										>
											-5h
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => updateHours(5)}
											className="h-7 text-xs"
										>
											+5h
										</Button>
									</div>
								</div>

								{/* Minutes */}
								<div className="space-y-2">
									<Label className="text-xs text-gray-500 dark:text-gray-400">
										Minuter
									</Label>
									<div className="flex items-center justify-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => updateMinutes(-1)}
											className="h-10 w-10 rounded-lg border-gray-300 dark:border-gray-600"
										>
											<Minus className="h-4 w-4" />
										</Button>
										<div className="flex h-14 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl text-gray-900 dark:bg-gray-700 dark:text-white">
											{String(minutes).padStart(2, '0')}
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => updateMinutes(1)}
											className="h-10 w-10 rounded-lg border-gray-300 dark:border-gray-600"
										>
											<Plus className="h-4 w-4" />
										</Button>
									</div>
									<div className="flex justify-center gap-1">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => updateMinutes(-15)}
											className="h-7 text-xs"
										>
											-15m
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => updateMinutes(15)}
											className="h-7 text-xs"
										>
											+15m
										</Button>
									</div>
								</div>
							</div>
						</div>

						{/* Separator */}
						<div className="border-t border-gray-200 dark:border-gray-700" />

						{/* Quick Select */}
						<div>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								Snabbval
							</p>
							<div className="grid grid-cols-5 gap-2">
								{quickTimes.map((time) => (
									<Button
										key={time.value}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => selectQuickTime(time.value)}
										className={cn(
											'h-10 rounded-lg border-gray-300 text-xs transition-all dark:border-gray-600',
											value === time.value
												? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
												: '',
										)}
									>
										{time.label}
									</Button>
								))}
							</div>
						</div>

						{/* Confirm Button */}
						<Button
							type="button"
							onClick={() => setIsOpen(false)}
							className="h-11 w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600"
						>
							Klar
						</Button>
					</div>
				</PopoverContent>
			</Popover>

			{error && (
				<p className="text-sm text-destructive mt-1">
					{error}
				</p>
			)}
		</div>
	);
}
