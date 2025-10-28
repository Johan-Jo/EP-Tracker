'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Save, Filter, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@/lib/schemas/time-entry';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';
import { toast } from 'react-hot-toast';

interface TimePageNewProps {
	orgId: string;
	userId: string;
	projectId?: string;
}

export function TimePageNew({ orgId, userId, projectId }: TimePageNewProps) {
	const [selectedProject, setSelectedProject] = useState(projectId || '');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingEntry, setEditingEntry] = useState<any | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
	const supabase = createClient();
	const queryClient = useQueryClient();
	
	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setSelectedProject(projectId);
		}
	}, [projectId]);

	const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
	const [startTime, setStartTime] = useState('08:00');
	const [endTime, setEndTime] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<CreateTimeEntryInput>({
		resolver: zodResolver(createTimeEntrySchema),
		defaultValues: {
			start_at: new Date().toISOString().split('T')[0] + 'T08:00',
		},
	});

	// Initialize start_at on mount and when date/time changes
	useEffect(() => {
		setValue('start_at', `${currentDate}T${startTime}`);
	}, [currentDate, startTime, setValue]);

	// Update stop_at when date changes (FIX: Prevents wrong duration calculation)
	useEffect(() => {
		if (endTime) {
			setValue('stop_at', `${currentDate}T${endTime}`);
		}
	}, [currentDate, endTime, setValue]);

	// Populate form when editing
	useEffect(() => {
		if (editingEntry) {
			const startDate = new Date(editingEntry.start_at);
			const stopDate = editingEntry.stop_at ? new Date(editingEntry.stop_at) : null;
			
			const date = startDate.toISOString().split('T')[0];
			const start = startDate.toTimeString().slice(0, 5);
			const stop = stopDate ? stopDate.toTimeString().slice(0, 5) : '';
			
			setCurrentDate(date);
			setStartTime(start);
			setEndTime(stop);
			setValue('project_id', editingEntry.project_id);
			setValue('start_at', editingEntry.start_at);
			setValue('stop_at', editingEntry.stop_at);
			setValue('notes', editingEntry.notes || '');
			setSelectedProject(editingEntry.project_id);
		}
	}, [editingEntry, setValue]);

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch time entries for stats and list
	const { data: timeEntries, refetch } = useQuery({
		queryKey: ['time-entries-stats', orgId, userId],
		queryFn: async () => {
			const response = await fetch(`/api/time/entries?user_id=${userId}`);
			if (!response.ok) throw new Error('Failed to fetch time entries');
			const data = await response.json();
			return data.entries || [];
		},
	});

	// Calculate stats
	const calculateStats = () => {
		if (!timeEntries) return { today: 0, yesterday: 0, thisWeek: 0, thisMonth: 0 };

		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterdayStart = new Date(todayStart);
		yesterdayStart.setDate(yesterdayStart.getDate() - 1);
		
		// Week starts on Monday
		const weekStart = new Date(todayStart);
		const day = weekStart.getDay();
		const diff = day === 0 ? 6 : day - 1; // Adjust for Monday start
		weekStart.setDate(weekStart.getDate() - diff);
		
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

		let today = 0, yesterday = 0, thisWeek = 0, thisMonth = 0;

		timeEntries.forEach((entry: any) => {
			const startDate = new Date(entry.start_at);
			const duration = entry.duration_min || 0;

			if (startDate >= todayStart) {
				today += duration;
			}
			if (startDate >= yesterdayStart && startDate < todayStart) {
				yesterday += duration;
			}
			if (startDate >= weekStart) {
				thisWeek += duration;
			}
			if (startDate >= monthStart) {
				thisMonth += duration;
			}
		});

		return { today, yesterday, thisWeek, thisMonth };
	};

	const stats = calculateStats();

	const formatDuration = (minutes: number): string => {
		if (!minutes) return '0h 0min';
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		return `${hours}h ${mins}min`;
	};

	const calculateDuration = () => {
		if (!startTime || !endTime) return '';
		
		const start = new Date(`${currentDate}T${startTime}`);
		const end = new Date(`${currentDate}T${endTime}`);
		const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
		
		if (totalMinutes <= 0) return '';
		
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours}h ${minutes}min`;
	};

	const handleDelete = (entryId: string) => {
		setEntryToDelete(entryId);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!entryToDelete) return;

		try {
			const response = await fetch(`/api/time/entries/${entryToDelete}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete time entry');
			}

			// If we were editing this entry, clear the editing state
			if (editingEntry?.id === entryToDelete) {
				setEditingEntry(null);
				const today = new Date().toISOString().split('T')[0];
				setCurrentDate(today);
				setStartTime('08:00');
				setEndTime('');
				reset({
					project_id: '',
					phase_id: null,
					work_order_id: null,
					task_label: '',
					start_at: today + 'T08:00',
					stop_at: null,
					notes: '',
				});
				setSelectedProject('');
			}

			// Invalidate cache and refetch
			queryClient.invalidateQueries({ queryKey: ['time-entries-stats', orgId, userId] });
			refetch();
			
			toast.success('Tidrapport borttagen');
		} catch (error) {
			console.error('Error deleting time entry:', error);
			toast.error('Misslyckades att ta bort tidrapport');
		} finally {
			setDeleteDialogOpen(false);
			setEntryToDelete(null);
		}
	};

	const onSubmit = async (data: CreateTimeEntryInput) => {
		if (!data.project_id || !data.start_at || !data.stop_at) {
			return;
		}

		setIsSubmitting(true);

		try {
			const isEditing = editingEntry !== null;
			const url = isEditing ? `/api/time/entries/${editingEntry.id}` : '/api/time/entries';
			const method = isEditing ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} time entry`);
			}

			// Invalidate cache and refetch
			queryClient.invalidateQueries({ queryKey: ['time-entries-stats', orgId, userId] });
			refetch();

			// Reset form and editing state
			const today = new Date().toISOString().split('T')[0];
			setCurrentDate(today);
			setStartTime('08:00');
			setEndTime('');
			reset({
				project_id: '',
				phase_id: null,
				work_order_id: null,
				task_label: '',
				start_at: today + 'T08:00',
				stop_at: null,
				notes: '',
			});
			setSelectedProject('');
			setEditingEntry(null);
		} catch (error) {
			console.error('Error saving time entry:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'approved':
				return 'bg-green-100 text-green-700 border-green-200';
			case 'submitted':
				return 'bg-yellow-100 text-yellow-700 border-yellow-200';
			case 'rejected':
				return 'bg-red-100 text-red-700 border-red-200';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'approved':
				return 'Godkänd';
			case 'submitted':
				return 'Väntar';
			case 'rejected':
				return 'Avvisad';
			default:
				return 'Utkast';
		}
	};

	const recentEntries = timeEntries?.slice(0, 10) || [];

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>
							Manuell tidsregistrering
						</h1>
						<p className='text-sm text-muted-foreground'>
							Registrera tid som redan har arbetats
						</p>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-5xl mx-auto'>
				{/* Manual Entry Form */}
				<div className='bg-card border-2 border-border rounded-xl p-6 mb-6 shadow-lg' data-tour="time-form">
					<div className='flex items-center justify-between mb-6'>
						<h3 className='text-xl font-semibold'>
							{editingEntry ? 'Redigera arbetstid' : 'Lägg till arbetstid'}
						</h3>
						{editingEntry && (
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setEditingEntry(null);
									const today = new Date().toISOString().split('T')[0];
									setCurrentDate(today);
									setStartTime('08:00');
									setEndTime('');
									reset({
										project_id: '',
										phase_id: null,
										work_order_id: null,
										task_label: '',
										start_at: today + 'T08:00',
										stop_at: null,
										notes: '',
									});
									setSelectedProject('');
								}}
							>
								Avbryt
							</Button>
						)}
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
						{/* Project */}
						<div>
							<label className='block text-sm font-medium mb-2'>
								Projekt <span className='text-destructive'>*</span>
							</label>
							{projectsLoading ? (
								<div className='flex items-center gap-2 text-sm text-muted-foreground'>
									<Loader2 className='w-4 h-4 animate-spin' />
									Laddar projekt...
								</div>
							) : (
								<Select
									value={watch('project_id') || ''}
									onValueChange={(value) => {
										setValue('project_id', value);
										setSelectedProject(value);
									}}
								>
									<SelectTrigger className='h-11'>
										<SelectValue placeholder='Välj projekt' />
									</SelectTrigger>
									<SelectContent>
										{projects?.map((project) => (
											<SelectItem key={project.id} value={project.id}>
												{project.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{errors.project_id && (
								<p className='text-sm text-destructive mt-1'>
									{errors.project_id.message}
								</p>
							)}
						</div>

						{/* Date */}
						<div>
							<label className='block text-sm font-medium mb-2'>
								Datum <span className='text-destructive'>*</span>
							</label>
							<div className='relative'>
								<Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
								<Input
									type='date'
									value={currentDate}
									onChange={(e) => {
										const date = e.target.value;
										setCurrentDate(date);
									}}
									className='pl-9 h-11'
								/>
							</div>
						</div>

						{/* Time Range */}
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='block text-sm font-medium mb-2'>
									Starttid <span className='text-destructive'>*</span>
								</label>
								<Input
									type='time'
									value={startTime}
									onChange={(e) => {
										const time = e.target.value;
										setStartTime(time);
										setValue('start_at', `${currentDate}T${time}`);
									}}
									className='h-11'
								/>
								{errors.start_at && (
									<p className='text-sm text-destructive mt-1'>
										{errors.start_at.message}
									</p>
								)}
							</div>
							<div>
								<label className='block text-sm font-medium mb-2'>
									Sluttid <span className='text-destructive'>*</span>
								</label>
								<Input
									type='time'
									value={endTime}
									onChange={(e) => {
										const time = e.target.value;
										setEndTime(time);
										if (time) {
											setValue('stop_at', `${currentDate}T${time}`);
										} else {
											setValue('stop_at', null);
										}
									}}
									className='h-11'
								/>
								{errors.stop_at && (
									<p className='text-sm text-destructive mt-1'>
										{errors.stop_at.message}
									</p>
								)}
							</div>
						</div>

						{/* Duration Display */}
						{calculateDuration() && (
							<div className='bg-orange-50 border-2 border-orange-200 rounded-lg p-3'>
								<p className='text-sm text-muted-foreground'>Total tid</p>
								<p className='text-xl font-semibold text-orange-600'>
									{calculateDuration()}
								</p>
							</div>
						)}

						{/* Description */}
						<div>
							<label className='block text-sm font-medium mb-2'>Beskrivning</label>
							<Textarea
								{...register('notes')}
								placeholder='Vad arbetade du med? (valfritt)'
								className='resize-none h-24'
							/>
						</div>

						{/* Save Button */}
						<Button
							type='submit'
							disabled={isSubmitting}
							className='w-full h-12 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200'
						>
							{isSubmitting ? (
								<>
									<Loader2 className='w-4 h-4 mr-2 animate-spin' />
								{editingEntry ? 'Uppdaterar...' : 'Sparar...'}
								</>
							) : (
								<>
									<Save className='w-4 h-4 mr-2' />
								{editingEntry ? 'Uppdatera tidsrapport' : 'Spara tidsrapport'}
								</>
							)}
						</Button>
					</form>
				</div>

				{/* Week Stats */}
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<p className='text-sm text-muted-foreground mb-1'>Idag</p>
						<p className='text-2xl'>{formatDuration(stats.today)}</p>
					</div>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<p className='text-sm text-muted-foreground mb-1'>Igår</p>
						<p className='text-2xl'>{formatDuration(stats.yesterday)}</p>
					</div>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<p className='text-sm text-muted-foreground mb-1'>Denna vecka</p>
						<p className='text-2xl'>{formatDuration(stats.thisWeek)}</p>
					</div>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<p className='text-sm text-muted-foreground mb-1'>Denna månad</p>
						<p className='text-2xl'>{formatDuration(stats.thisMonth)}</p>
					</div>
				</div>

				{/* Recent Entries */}
				<div data-tour="time-entries">
					<div className='flex items-center justify-between mb-4'>
						<h3 className='text-xl font-semibold'>Senaste registreringar</h3>
						<Button variant='outline' size='sm'>
							<Filter className='w-4 h-4 mr-2' />
							Filter
						</Button>
					</div>

					<div className='space-y-3'>
						{recentEntries.length === 0 ? (
							<Card className='border-2 border-border'>
								<CardContent className='flex flex-col items-center justify-center p-12 text-center'>
									<Clock className='w-12 h-12 text-muted-foreground mb-4' />
									<p className='text-muted-foreground'>Inga tidrapporter hittades</p>
									<p className='text-sm text-muted-foreground mt-2'>
										Börja genom att fylla i formuläret ovan
									</p>
								</CardContent>
							</Card>
						) : (
							recentEntries.map((entry: any) => (
								<div
									key={entry.id}
									className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md hover:scale-[1.01] transition-all duration-200'
								>
									<div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
										{/* Left side - Info */}
										<div className='flex-1 min-w-0'>
											<div className='flex items-start gap-3 mb-2'>
												<div className='p-2 rounded-lg bg-orange-50 shrink-0'>
													<Clock className='w-4 h-4 text-orange-600' />
												</div>
												<div className='flex-1 min-w-0'>
													<h4 className='font-semibold text-base truncate mb-1'>
														{entry.project?.name || 'Okänt projekt'}
													</h4>
													<p className='text-sm text-muted-foreground'>
														{entry.task_label || entry.notes || 'Ingen beskrivning'}
													</p>
												</div>
											</div>
											<div className='flex flex-wrap gap-4 text-sm text-muted-foreground ml-11'>
												<span>
													{new Date(entry.start_at).toLocaleDateString('sv-SE')}
												</span>
												<span>
													{new Date(entry.start_at).toLocaleTimeString('sv-SE', {
														hour: '2-digit',
														minute: '2-digit',
													})}
													{entry.stop_at &&
														` - ${new Date(entry.stop_at).toLocaleTimeString('sv-SE', {
															hour: '2-digit',
															minute: '2-digit',
														})}`}
												</span>
											</div>
										</div>

										{/* Right side - Duration and Status */}
										<div className='flex items-center gap-3 ml-11 md:ml-0'>
											<div className='text-right'>
												<p className='text-xl'>
													{formatDuration(entry.duration_min || 0)}
												</p>
											</div>
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium border-2 whitespace-nowrap ${getStatusColor(
													entry.status
												)}`}
											>
												{getStatusText(entry.status)}
											</span>
											{entry.status === 'draft' && (
												<>
													<Button
														variant='outline'
														size='sm'
														className='hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all duration-200'
														onClick={() => {
															setEditingEntry(entry);
															window.scrollTo({ top: 0, behavior: 'smooth' });
														}}
													>
														Ändra
													</Button>
													<Button
														variant='outline'
														size='sm'
														className='hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200'
														onClick={() => handleDelete(entry.id)}
													>
														<Trash2 className='w-4 h-4' />
													</Button>
												</>
											)}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</main>
			<PageTourTrigger tourId="time" />
			
			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Ta bort tidrapport?</AlertDialogTitle>
						<AlertDialogDescription>
							Är du säker på att du vill ta bort denna tidrapport? Denna åtgärd kan inte ångras.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Avbryt</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className='bg-red-600 hover:bg-red-700 focus:ring-red-600'
						>
							Ta bort
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

