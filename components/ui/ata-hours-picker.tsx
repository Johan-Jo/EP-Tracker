'use client';

import { useState } from 'react';
import { Clock, Plus, Minus } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

interface AtaHoursPickerProps {
	id: string;
	label: string;
	value: number; // Total minutes (0-1440 for 0-24 hours)
	onChange: (minutes: number) => void;
	className?: string;
}

export function AtaHoursPicker({
	id,
	label,
	value,
	onChange,
	className,
}: AtaHoursPickerProps) {
	const [isOpen, setIsOpen] = useState(false);

	const totalMinutes = value || 0;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	// Quick select times (in minutes)
	const quickTimes = [
		{ label: '0h', minutes: 0 },
		{ label: '30m', minutes: 30 },
		{ label: '1h', minutes: 60 },
		{ label: '1h 30m', minutes: 90 },
		{ label: '2h', minutes: 120 },
		{ label: '3h', minutes: 180 },
		{ label: '4h', minutes: 240 },
		{ label: '6h', minutes: 360 },
		{ label: '8h', minutes: 480 },
	];

	const updateHours = (delta: number) => {
		const newHours = Math.max(0, Math.min(24, hours + delta));
		const newTotalMinutes = newHours * 60 + minutes;
		onChange(Math.min(1440, newTotalMinutes)); // Max 24 hours
	};

	const updateMinutes = (delta: number) => {
		let newMinutes = minutes + delta;
		let newHours = hours;

		if (newMinutes >= 60) {
			newMinutes = newMinutes % 60;
			newHours = Math.min(24, newHours + 1);
		} else if (newMinutes < 0) {
			newMinutes = 60 + newMinutes;
			newHours = Math.max(0, newHours - 1);
		}

		const newTotalMinutes = newHours * 60 + newMinutes;
		onChange(Math.min(1440, newTotalMinutes)); // Max 24 hours
	};

	const selectQuickTime = (minutes: number) => {
		onChange(minutes);
		setIsOpen(false);
	};

	const formatDisplayValue = () => {
		if (totalMinutes === 0) return '0h';
		const h = Math.floor(totalMinutes / 60);
		const m = totalMinutes % 60;
		if (h === 0) return `${m}min`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}min`;
	};

	return (
		<div className={cn('space-y-2', className)}>
			<Label htmlFor={id} className="text-gray-700 dark:text-gray-300">
				{label}
			</Label>

			<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					className={`flex h-14 w-full items-center justify-between rounded-xl px-4 text-left transition-all ${
						value > 0
							? 'border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
							: 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'
					} hover:border-orange-400 dark:hover:border-orange-500`}
				>
					<span
						className={`text-lg ${
							value > 0
								? 'font-semibold text-orange-600 dark:text-orange-400'
								: 'text-gray-900 dark:text-white'
						}`}
					>
						{formatDisplayValue()}
					</span>
					<Clock className={`h-5 w-5 ${value > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
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
											disabled={totalMinutes < 60}
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
											disabled={totalMinutes >= 1440 - 60}
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
											disabled={totalMinutes < 300}
											className="h-7 text-xs"
										>
											-5h
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => updateHours(5)}
											disabled={totalMinutes >= 1140}
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
											disabled={totalMinutes >= 1440}
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
											disabled={totalMinutes >= 1425}
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
										key={time.minutes}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => selectQuickTime(time.minutes)}
										className={cn(
											'h-10 rounded-lg border-gray-300 text-xs transition-all dark:border-gray-600',
											totalMinutes === time.minutes
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
		</div>
	);
}

