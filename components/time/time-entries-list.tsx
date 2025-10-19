'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Edit2, Trash2, Loader2, Calendar } from 'lucide-react';
import { TimeEntryWithRelations } from '@/lib/schemas/time-entry';

interface TimeEntriesListProps {
	orgId: string;
	userId?: string;
	projectId?: string;
	onEdit?: (entry: TimeEntryWithRelations) => void;
}

export function TimeEntriesList({ orgId, userId, projectId, onEdit }: TimeEntriesListProps) {
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [projectFilter, setProjectFilter] = useState<string>(projectId || 'all');
	
	// Fetch time entries
	const { data: entries, isLoading, refetch } = useQuery({
		queryKey: ['time-entries', orgId, userId, projectFilter, statusFilter],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (userId) params.append('user_id', userId);
			if (projectFilter !== 'all') params.append('project_id', projectFilter);
			if (statusFilter !== 'all') params.append('status', statusFilter);

			const response = await fetch(`/api/time/entries?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch time entries');
			
			const data = await response.json();
			return data.entries as TimeEntryWithRelations[];
		},
	});

	// Fetch projects for filter
	const { data: projects } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const supabase = (await import('@/lib/supabase/client')).createClient();
			const { data, error } = await supabase
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	const handleDelete = async (entryId: string) => {
		if (!confirm('Är du säker på att du vill ta bort denna tidrapport?')) return;

		try {
			const response = await fetch(`/api/time/entries/${entryId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete');
			}

			refetch();
		} catch (error) {
			console.error('Error deleting time entry:', error);
			alert('Misslyckades att ta bort tidrapport');
		}
	};

	const formatDuration = (minutes: number | null): string => {
		if (!minutes) return '-';
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		return `${hours}h ${mins}m`;
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
			draft: { label: 'Utkast', variant: 'outline' },
			submitted: { label: 'Inskickad', variant: 'default' },
			approved: { label: 'Godkänd', variant: 'default' },
			rejected: { label: 'Avvisad', variant: 'destructive' },
		};

		const config = variants[status] || { label: status, variant: 'outline' };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	// Group entries by date
	const groupedEntries = entries?.reduce((acc, entry) => {
		// Use Intl API instead of date-fns (0KB vs 190KB!)
		const date = new Date(entry.start_at).toISOString().split('T')[0]; // yyyy-MM-dd
		if (!acc[date]) acc[date] = [];
		acc[date].push(entry);
		return acc;
	}, {} as Record<string, TimeEntryWithRelations[]>) || {};

	const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				{!projectId && (
					<Select value={projectFilter} onValueChange={setProjectFilter}>
						<SelectTrigger className="w-full sm:w-64">
							<SelectValue placeholder="Alla projekt" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alla projekt</SelectItem>
							{projects?.map((project) => (
								<SelectItem key={project.id} value={project.id}>
									{project.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full sm:w-48">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Alla status</SelectItem>
						<SelectItem value="draft">Utkast</SelectItem>
						<SelectItem value="submitted">Inskickad</SelectItem>
						<SelectItem value="approved">Godkänd</SelectItem>
						<SelectItem value="rejected">Avvisad</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Entries grouped by date */}
			{sortedDates.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center p-8 text-center">
						<Clock className="w-12 h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground">Inga tidrapporter hittades</p>
						<p className="text-sm text-muted-foreground mt-2">
							Börja genom att starta timern eller lägg till tid manuellt
						</p>
					</CardContent>
				</Card>
			) : (
				sortedDates.map((date) => {
					const dateEntries = groupedEntries[date];
					const totalMinutes = dateEntries.reduce((sum, e) => sum + (e.duration_min || 0), 0);

					return (
						<div key={date} className="space-y-2">
							{/* Date header */}
							<div className="flex items-center justify-between px-2">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<h3 className="font-semibold">
										{new Intl.DateTimeFormat('sv-SE', {
											weekday: 'long',
											day: 'numeric',
											month: 'long',
											year: 'numeric'
										}).format(new Date(date))}
									</h3>
								</div>
								<span className="text-sm text-muted-foreground font-medium">
									Total: {formatDuration(totalMinutes)}
								</span>
							</div>

							{/* Entries for this date */}
							<div className="space-y-2">
								{dateEntries.map((entry) => (
									<Card key={entry.id}>
										<CardContent className="p-4">
											<div className="flex items-start justify-between">
												<div className="flex-1 space-y-2">
													<div className="flex items-center gap-2">
														<h4 className="font-medium">{entry.project.name}</h4>
														{getStatusBadge(entry.status)}
													</div>
													
													{(entry.phase || entry.work_order || entry.task_label) && (
														<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
															{entry.phase && <Badge variant="outline">{entry.phase.name}</Badge>}
															{entry.work_order && <Badge variant="outline">{entry.work_order.name}</Badge>}
															{entry.task_label && <span>{entry.task_label}</span>}
														</div>
													)}

													<div className="flex items-center gap-4 text-sm text-muted-foreground">
														<div className="flex items-center gap-1">
															<Clock className="w-3 h-3" />
															<span>
																{new Date(entry.start_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
																{entry.stop_at && ` - ${new Date(entry.stop_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`}
															</span>
														</div>
														{entry.duration_min && (
															<span className="font-medium">
																{formatDuration(entry.duration_min)}
															</span>
														)}
													</div>

													{entry.notes && (
														<p className="text-sm text-muted-foreground italic">
															{entry.notes}
														</p>
													)}
												</div>

												{/* Actions */}
												<div className="flex items-center gap-2 ml-4">
													{entry.status === 'draft' && (
														<>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => onEdit?.(entry)}
															>
																<Edit2 className="w-4 h-4" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => handleDelete(entry.id)}
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														</>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}

