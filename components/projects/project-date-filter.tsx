'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export type DateFilterType = 'all' | 'thisMonth' | 'thisWeek' | 'custom';

interface ProjectDateFilterProps {
	projectStartDate: string; // ISO date string
	onFilterChange: (startDate: string | null, endDate: string | null) => void;
}

export function ProjectDateFilter({ projectStartDate, onFilterChange }: ProjectDateFilterProps) {
	const [filterType, setFilterType] = useState<DateFilterType>('all');
	const [customStartDate, setCustomStartDate] = useState<string>('');
	const [customEndDate, setCustomEndDate] = useState<string>('');

	useEffect(() => {
		// Apply filter when filterType or custom dates change
		const now = new Date();
		let start: string | null = null;
		let end: string | null = null;

		switch (filterType) {
			case 'all':
				// Project start to today
				start = projectStartDate;
				end = now.toISOString().split('T')[0];
				break;
			case 'thisMonth':
				// First day of current month to today
				start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
				end = now.toISOString().split('T')[0];
				break;
			case 'thisWeek':
				// Monday of current week to today
				const day = now.getDay();
				const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
				const monday = new Date(now.setDate(diff));
				monday.setHours(0, 0, 0, 0);
				start = monday.toISOString().split('T')[0];
				end = now.toISOString().split('T')[0];
				break;
			case 'custom':
				if (customStartDate && customEndDate) {
					start = customStartDate;
					end = customEndDate;
				} else if (customStartDate) {
					start = customStartDate;
					end = now.toISOString().split('T')[0];
				}
				break;
		}

		onFilterChange(start, end);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterType, customStartDate, customEndDate, projectStartDate]);

	const handleFilterTypeChange = (type: DateFilterType) => {
		setFilterType(type);
		if (type !== 'custom') {
			setCustomStartDate('');
			setCustomEndDate('');
		}
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<span className="text-sm font-medium text-muted-foreground">Filtrera:</span>
			<Button
				variant={filterType === 'all' ? 'default' : 'outline'}
				size="sm"
				onClick={() => handleFilterTypeChange('all')}
			>
				Projektstart
			</Button>
			<Button
				variant={filterType === 'thisMonth' ? 'default' : 'outline'}
				size="sm"
				onClick={() => handleFilterTypeChange('thisMonth')}
			>
				Denna månad
			</Button>
			<Button
				variant={filterType === 'thisWeek' ? 'default' : 'outline'}
				size="sm"
				onClick={() => handleFilterTypeChange('thisWeek')}
			>
				Denna vecka
			</Button>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant={filterType === 'custom' ? 'default' : 'outline'}
						size="sm"
						onClick={() => handleFilterTypeChange('custom')}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						Anpassat
						{(customStartDate || customEndDate) && (
							<span className="ml-2">
								{customStartDate}
								{customStartDate && customEndDate && ' - '}
								{customEndDate}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-4" align="start">
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium mb-2 block">Från datum</label>
							<Input
								type="date"
								value={customStartDate}
								onChange={(e) => setCustomStartDate(e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium mb-2 block">Till datum</label>
							<Input
								type="date"
								value={customEndDate}
								onChange={(e) => setCustomEndDate(e.target.value)}
								min={customStartDate || undefined}
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

