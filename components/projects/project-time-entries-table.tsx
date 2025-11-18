'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ArrowUpDown, Clock, User, Calendar, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface TimeEntryWithDiary {
	id: string;
	date: string; // YYYY-MM-DD
	user: {
		id: string;
		name: string;
	};
	phase: {
		id: string;
		name: string;
	} | null;
	hours: number;
	taskLabel: string | null;
	diary: {
		id: string;
		work_performed: string | null;
		weather: string | null;
		temperature_c: number | null;
		crew_count: number | null;
	} | null;
}

interface ProjectTimeEntriesTableProps {
	timeEntries: TimeEntryWithDiary[];
}

type SortField = 'date' | 'user' | 'phase' | 'hours';
type SortDirection = 'asc' | 'desc';

export function ProjectTimeEntriesTable({ timeEntries }: ProjectTimeEntriesTableProps) {
	const [sortField, setSortField] = useState<SortField>('date');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('desc');
		}
	};

	const toggleRow = (entryId: string) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(entryId)) {
			newExpanded.delete(entryId);
		} else {
			newExpanded.add(entryId);
		}
		setExpandedRows(newExpanded);
	};

	const sortedEntries = useMemo(() => {
		const sorted = [...timeEntries].sort((a, b) => {
			let comparison = 0;

			switch (sortField) {
				case 'date':
					comparison = a.date.localeCompare(b.date);
					break;
				case 'user':
					comparison = a.user.name.localeCompare(b.user.name);
					break;
				case 'phase':
					const phaseA = a.phase?.name || '';
					const phaseB = b.phase?.name || '';
					comparison = phaseA.localeCompare(phaseB);
					break;
				case 'hours':
					comparison = a.hours - b.hours;
					break;
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return sorted;
	}, [timeEntries, sortField, sortDirection]);

	// Calculate summaries
	const totalHours = useMemo(() => {
		return sortedEntries.reduce((sum, entry) => sum + entry.hours, 0);
	}, [sortedEntries]);

	const hoursByUser = useMemo(() => {
		const map = new Map<string, number>();
		sortedEntries.forEach((entry) => {
			const current = map.get(entry.user.id) || 0;
			map.set(entry.user.id, current + entry.hours);
		});
		return Array.from(map.entries())
			.map(([userId, hours]) => {
				const user = sortedEntries.find((e) => e.user.id === userId)?.user;
				return { userId, userName: user?.name || 'Okänd', hours: Math.round(hours * 10) / 10 };
			})
			.sort((a, b) => b.hours - a.hours);
	}, [sortedEntries]);

	const hoursByPhase = useMemo(() => {
		const map = new Map<string, number>();
		sortedEntries.forEach((entry) => {
			if (entry.phase) {
				const current = map.get(entry.phase.id) || 0;
				map.set(entry.phase.id, current + entry.hours);
			}
		});
		return Array.from(map.entries())
			.map(([phaseId, hours]) => {
				const phase = sortedEntries.find((e) => e.phase?.id === phaseId)?.phase;
				return { phaseId, phaseName: phase?.name || 'Okänd', hours: Math.round(hours * 10) / 10 };
			})
			.sort((a, b) => b.hours - a.hours);
	}, [sortedEntries]);

	const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
		<Button
			variant="ghost"
			size="sm"
			className="h-8 gap-1 hover:bg-transparent"
			onClick={() => handleSort(field)}
		>
			{children}
			{sortField === field ? (
				sortDirection === 'asc' ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)
			) : (
				<ArrowUpDown className="h-4 w-4 opacity-50" />
			)}
		</Button>
	);

	if (timeEntries.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Tidrapportering & Dagböcker</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground text-center py-8">
						Inga tidrapporter hittades för det valda datumintervallet.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Main Table */}
			<Card>
				<CardHeader>
					<CardTitle>Tidrapportering & Dagböcker</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[100px]">
									<SortButton field="date">
										<Calendar className="h-4 w-4 mr-1 inline" />
										Datum
									</SortButton>
								</TableHead>
								<TableHead>
									<SortButton field="user">
										<User className="h-4 w-4 mr-1 inline" />
										Person
									</SortButton>
								</TableHead>
								<TableHead>
									<SortButton field="phase">
										<FolderKanban className="h-4 w-4 mr-1 inline" />
										Fas
									</SortButton>
								</TableHead>
								<TableHead className="min-w-[300px]">Dagbok</TableHead>
								<TableHead className="w-[100px] text-right">
									<SortButton field="hours">
										<Clock className="h-4 w-4 mr-1 inline" />
										Timmar
									</SortButton>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedEntries.map((entry) => {
								const isExpanded = expandedRows.has(entry.id);
								const hasDiary = entry.diary?.work_performed;
								const diaryText = entry.diary?.work_performed || '';
								const shouldTruncate = diaryText.length > 150;

								return (
									<React.Fragment key={entry.id}>
										<TableRow
											className="cursor-pointer hover:bg-muted/50"
											onClick={() => hasDiary && toggleRow(entry.id)}
										>
											<TableCell>
												{format(new Date(entry.date), 'yyyy-MM-dd', { locale: sv })}
											</TableCell>
											<TableCell className="font-medium">{entry.user.name}</TableCell>
											<TableCell>{entry.phase?.name || '-'}</TableCell>
											<TableCell>
												{hasDiary ? (
													<div className="space-y-1">
														<p className={shouldTruncate && !isExpanded ? 'line-clamp-2' : ''}>
															{diaryText}
														</p>
														{shouldTruncate && (
															<Button
																variant="ghost"
																size="sm"
																className="h-6 text-xs"
																onClick={(e) => {
																	e.stopPropagation();
																	toggleRow(entry.id);
																}}
															>
																{isExpanded ? 'Visa mindre' : 'Visa mer'}
															</Button>
														)}
													</div>
												) : (
													<span className="text-muted-foreground italic">Ingen dagbok</span>
												)}
											</TableCell>
											<TableCell className="text-right font-medium">
												{entry.hours.toFixed(2)}h
											</TableCell>
										</TableRow>
										{isExpanded && entry.diary && (
											<TableRow className="bg-muted/30">
												<TableCell colSpan={5} className="p-4">
													<div className="space-y-2 text-sm">
														<div>
															<span className="font-medium">Arbete utfört:</span>
															<p className="mt-1 text-muted-foreground whitespace-pre-wrap">
																{entry.diary.work_performed}
															</p>
														</div>
														{(entry.diary.weather ||
															entry.diary.temperature_c !== null ||
															entry.diary.crew_count !== null) && (
															<div className="flex gap-4 pt-2 border-t">
																{entry.diary.weather && (
																	<div>
																		<span className="font-medium">Väder: </span>
																		<span className="text-muted-foreground">{entry.diary.weather}</span>
																	</div>
																)}
																{entry.diary.temperature_c !== null && (
																	<div>
																		<span className="font-medium">Temperatur: </span>
																		<span className="text-muted-foreground">{entry.diary.temperature_c}°C</span>
																	</div>
																)}
																{entry.diary.crew_count !== null && (
																	<div>
																		<span className="font-medium">Antal personer: </span>
																		<span className="text-muted-foreground">{entry.diary.crew_count}</span>
																	</div>
																)}
															</div>
														)}
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Summary by User */}
			{hoursByUser.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Sammanfattning per person</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{hoursByUser.map((summary) => (
								<div
									key={summary.userId}
									className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
								>
									<span className="font-medium">{summary.userName}</span>
									<span className="text-lg font-bold">{summary.hours}h</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary by Phase */}
			{hoursByPhase.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Sammanfattning per fas</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{hoursByPhase.map((summary) => (
								<div
									key={summary.phaseId}
									className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
								>
									<span className="font-medium">{summary.phaseName}</span>
									<span className="text-lg font-bold">{summary.hours}h</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

