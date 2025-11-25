'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DatePickerInputProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	className?: string;
	error?: string;
}

export function DatePickerInput({
	id,
	label,
	value,
	onChange,
	required = false,
	className,
	error,
}: DatePickerInputProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Parse current value - handle timezone issues by parsing manually
	const parseValue = (dateStr: string) => {
		if (!dateStr) {
			const today = new Date();
			return new Date(today.getFullYear(), today.getMonth(), today.getDate());
		}
		const [year, month, day] = dateStr.split('-').map(Number);
		return new Date(year, month - 1, day);
	};

	const selectedDate = parseValue(value);
	const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
	const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

	// Update view month/year when value changes
	useEffect(() => {
		const date = parseValue(value);
		setViewMonth(date.getMonth());
		setViewYear(date.getFullYear());
	}, [value]);

	const months = [
		'Januari',
		'Februari',
		'Mars',
		'April',
		'Maj',
		'Juni',
		'Juli',
		'Augusti',
		'September',
		'Oktober',
		'November',
		'December',
	];

	const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

	// Quick select dates
	const todayForQuickSelect = new Date();
	const yesterday = new Date(todayForQuickSelect);
	yesterday.setDate(todayForQuickSelect.getDate() - 1);
	const dayBeforeYesterday = new Date(todayForQuickSelect);
	dayBeforeYesterday.setDate(todayForQuickSelect.getDate() - 2);

	const quickDates = [
		{ label: 'Igår', date: yesterday },
		{ label: 'I förrgår', date: dayBeforeYesterday },
	];

	const formatDate = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const formatDisplayDate = (dateStr: string) => {
		if (!dateStr) {
			const today = new Date();
			return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
		}
		const [year, month, dayNum] = dateStr.split('-').map(Number);
		const date = new Date(year, month - 1, dayNum);
		const day = date.getDate();
		const monthName = months[date.getMonth()];
		const yearNum = date.getFullYear();
		return `${day} ${monthName} ${yearNum}`;
	};

	const getDaysInMonth = (month: number, year: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (month: number, year: number) => {
		const day = new Date(year, month, 1).getDay();
		// Convert Sunday (0) to 7, and shift so Monday is 0
		return day === 0 ? 6 : day - 1;
	};

	const selectDate = (date: Date) => {
		const dateString = formatDate(date);
		// Always call onChange, even if it's the same date, to ensure it's set
		onChange(dateString);
		setIsOpen(false);
	};

	const selectQuickDate = (date: Date) => {
		onChange(formatDate(date));
		setViewMonth(date.getMonth());
		setViewYear(date.getFullYear());
		setIsOpen(false);
	};

	const previousMonth = () => {
		if (viewMonth === 0) {
			setViewMonth(11);
			setViewYear(viewYear - 1);
		} else {
			setViewMonth(viewMonth - 1);
		}
	};

	const nextMonth = () => {
		if (viewMonth === 11) {
			setViewMonth(0);
			setViewYear(viewYear + 1);
		} else {
			setViewMonth(viewMonth + 1);
		}
	};

	const isToday = (day: number) => {
		const today = new Date();
		return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
	};

	const isSelected = (day: number) => {
		if (!value) return false;
		const [year, month, dayNum] = value.split('-').map(Number);
		const selected = new Date(year, month - 1, dayNum);
		return day === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();
	};

	const renderCalendar = () => {
		const daysInMonth = getDaysInMonth(viewMonth, viewYear);
		const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
		const days = [];

		// Empty cells for days before month starts
		for (let i = 0; i < firstDay; i++) {
			days.push(<div key={`empty-${i}`} className="aspect-square" />);
		}

		// Days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(viewYear, viewMonth, day);
			const selected = isSelected(day);
			const isCurrentDay = isToday(day);

			days.push(
				<button
					key={day}
					type="button"
					onClick={() => selectDate(date)}
					className={`aspect-square rounded-lg text-sm transition-all ${
						selected
							? 'bg-orange-500 text-white hover:bg-orange-600'
							: isCurrentDay
							? 'border-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
					}`}
				>
					{day}
				</button>
			);
		}

		return days;
	};

	return (
		<div className={`space-y-2 ${className || ''}`}>
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
						{formatDisplayDate(value)}
					</span>
					<Calendar className="h-5 w-5 text-gray-400" />
				</button>
			</PopoverTrigger>

				<PopoverContent
					className="w-80 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 z-[10000]"
					align="start"
				>
					<div className="space-y-4">
						{/* Quick Select */}
						<div>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Snabbval</p>
							<div className="grid grid-cols-2 gap-2">
								{quickDates.map((quick, index) => (
									<Button
										key={index}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => selectQuickDate(quick.date)}
										className="h-10 rounded-lg border-gray-300 text-xs dark:border-gray-600"
									>
										{quick.label}
									</Button>
								))}
							</div>
						</div>

						{/* Separator */}
						<div className="border-t border-gray-200 dark:border-gray-700" />

						{/* Month Navigation */}
						<div className="flex items-center justify-between">
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={previousMonth}
								className="h-9 w-9 rounded-lg border-gray-300 dark:border-gray-600"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<span className="text-gray-900 dark:text-white">
								{months[viewMonth]} {viewYear}
							</span>

							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={nextMonth}
								className="h-9 w-9 rounded-lg border-gray-300 dark:border-gray-600"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>

						{/* Calendar Grid */}
						<div>
							{/* Week day headers */}
							<div className="mb-2 grid grid-cols-7 gap-1">
								{weekDays.map((day) => (
									<div
										key={day}
										className="aspect-square text-center text-xs text-gray-500 dark:text-gray-400"
									>
										{day}
									</div>
								))}
							</div>

							{/* Calendar days */}
							<div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
						</div>

						{/* Footer */}
						<div className="flex gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									onChange('');
									setIsOpen(false);
								}}
								className="flex-1 rounded-xl border-gray-300 dark:border-gray-600"
							>
								Rensa
							</Button>
							<Button
								type="button"
								onClick={() => setIsOpen(false)}
								className="flex-1 rounded-xl bg-orange-500 text-white hover:bg-orange-600"
							>
								Klar
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{error && <p className="text-sm text-destructive mt-1">{error}</p>}
		</div>
	);
}

