'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Save, Filter, Loader2, Trash2, BookOpen, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Removed textarea for description; diary prompt will be used instead
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@/lib/schemas/time-entry';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';

interface OrgMember {
	id: string;
	user_id: string;
	role: string;
	profiles: {
		id: string;
		full_name: string;
		email: string;
	};
}

interface TimePageNewProps {
	orgId: string;
	userId: string;
	userRole: string;
	projectId?: string;
}

interface ProjectOption {
	id: string;
	name: string;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_time_billing_type: BillingType;
}

interface FixedBlockOption {
	id: string;
	name: string;
	amount_sek: number;
	status: 'open' | 'closed';
}

type TimeEntryFormValues = Omit<CreateTimeEntryInput, 'billing_type' | 'fixed_block_id'> & {
	billing_type: '' | BillingType;
	fixed_block_id: string | null;
};

export function TimePageNew({ orgId, userId, userRole, projectId }: TimePageNewProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingEntry, setEditingEntry] = useState<any | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
	const [showDiaryPromptDialog, setShowDiaryPromptDialog] = useState(false);
	const [completedProjectId, setCompletedProjectId] = useState<string | null>(null);
	const [showFilterDialog, setShowFilterDialog] = useState(false);
	const [filterProject, setFilterProject] = useState<string>('');
	const [filterStatus, setFilterStatus] = useState<string>('');
	const [filterUserId, setFilterUserId] = useState<string>('');
	const [filterStartDate, setFilterStartDate] = useState<string>('');
	const [filterEndDate, setFilterEndDate] = useState<string>('');
	const [diaryLoadingMap, setDiaryLoadingMap] = useState<Record<string, boolean>>({});
	const [billingInteractionRequired, setBillingInteractionRequired] = useState(false);
	const supabase = createClient();
	const queryClient = useQueryClient();
	
	// Check if user can see all entries (admin/foreman/finance)
	const canSeeAllEntries = userRole === 'admin' || userRole === 'foreman' || userRole === 'finance';
	
	// Function to handle diary button click - checks if diary exists, then navigates
	const handleDiaryClick = async (entry: any) => {
		if (!entry.project_id) {
			toast.error('Inget projekt kopplat till denna tidsregistrering');
			return;
		}
		
		const entryDate = new Date(entry.start_at).toISOString().split('T')[0];
		const entryUserId = entry.user_id ?? entry.user?.id;
		if (!entryUserId) {
			toast.error('Kunde inte bestämma vilken användare som äger tidsregistreringen');
			return;
		}
		const entryKey = `${entry.id}`;
		
		setDiaryLoadingMap(prev => ({ ...prev, [entryKey]: true }));
		
		try {
			// Check if diary entry exists for this project and date
			const params = new URLSearchParams({
				project_id: entry.project_id,
				date: entryDate,
				user_id: entryUserId,
			});

			const response = await fetch(`/api/diary/find?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to check diary entry');
			}
			
			const data = await response.json();
			
			if (data.diary?.id) {
				// Diary exists - navigate to edit page
				window.location.href = `/dashboard/diary/${data.diary.id}?edit=1`;
			} else {
				// No diary exists - navigate to create page with project and date
				const newEntryUrl = new URL(window.location.origin + '/dashboard/diary/new');
				newEntryUrl.searchParams.set('project_id', entry.project_id);
				newEntryUrl.searchParams.set('date', entryDate);
				newEntryUrl.searchParams.set('user_id', entryUserId);
				window.location.href = `${newEntryUrl.pathname}${newEntryUrl.search}`;
			}
		} catch (error) {
			console.error('Error checking diary entry:', error);
			toast.error('Misslyckades att öppna dagbok');
		} finally {
			setDiaryLoadingMap(prev => ({ ...prev, [entryKey]: false }));
		}
	};
	
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
	} = useForm<TimeEntryFormValues>({
		resolver: zodResolver(createTimeEntrySchema) as Resolver<TimeEntryFormValues>,
		defaultValues: {
			start_at: new Date().toISOString().split('T')[0] + 'T08:00',
			project_id: '',
			phase_id: null,
			work_order_id: null,
			task_label: '',
			billing_type: '',
			fixed_block_id: null,
			stop_at: null,
		},
	});

	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setValue('project_id', projectId, { shouldDirty: true });
		}
	}, [projectId, setValue]);

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

	const watchedProjectId = watch('project_id');
	const selectedProjectId = watchedProjectId ? String(watchedProjectId) : '';
	const billingType = watch('billing_type') as TimeEntryFormValues['billing_type'];
	const fixedBlockId = watch('fixed_block_id') as TimeEntryFormValues['fixed_block_id'];

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
			setValue('project_id', editingEntry.project_id ? String(editingEntry.project_id) : '', { shouldDirty: true });
			setValue('start_at', editingEntry.start_at);
			setValue('stop_at', editingEntry.stop_at);
			setValue('billing_type', editingEntry.billing_type ?? 'LOPANDE', { shouldDirty: true });
			setValue('fixed_block_id', editingEntry.fixed_block_id ?? null, { shouldDirty: true });
		}
	}, [editingEntry, setValue]);

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery<ProjectOption[]>({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, billing_mode, default_time_billing_type')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
		staleTime: 5 * 60 * 1000,  // 5 minutes (projects rarely change)
		gcTime: 10 * 60 * 1000,     // 10 minutes
	});

	const selectedProjectDetails = useMemo(() => {
		if (!selectedProjectId) return undefined;
		return projects?.find((project) => String(project.id) === String(selectedProjectId));
	}, [projects, selectedProjectId]);

	const effectiveBillingMode =
		selectedProjectDetails?.billing_mode ?? (selectedProjectId ? 'LOPANDE_ONLY' : undefined);

	const {
		data: fixedBlocks = [],
		isLoading: fixedBlocksLoading,
		error: fixedBlocksError,
	} = useQuery<FixedBlockOption[]>({
		queryKey: ['fixed-time-blocks', selectedProjectId],
		queryFn: async () => {
			if (!selectedProjectId) return [];
			if (effectiveBillingMode !== 'FAST_ONLY' && effectiveBillingMode !== 'BOTH') {
				return [];
			}
			const response = await fetch(`/api/fixed-time-blocks?projectId=${selectedProjectId}`);
			if (!response.ok) {
				throw new Error('Kunde inte hämta fasta poster');
			}
			const json = await response.json();
			return json.blocks || [];
		},
		enabled:
			!!selectedProjectId &&
			(effectiveBillingMode === 'FAST_ONLY' || effectiveBillingMode === 'BOTH'),
	});

	const hasFixedBlocks = fixedBlocks.length > 0;
	const fixedBlocksErrorMessage =
		fixedBlocksError instanceof Error ? fixedBlocksError.message : undefined;

	useEffect(() => {
		if (process.env.NODE_ENV !== 'production') {
			console.log('TimePageNew watch', {
				projectId: selectedProjectId || null,
				billingType,
				fixedBlockId,
				projectsCount: projects?.length ?? 0,
				hasProjectDetails: Boolean(selectedProjectDetails),
				effectiveBillingMode,
				fixedBlocksCount: fixedBlocks.length,
				hasFixedBlocks,
			});
		}

		if (!selectedProjectId) {
			if (billingType !== '') {
				setValue('billing_type', '', { shouldDirty: true });
			}
			if (fixedBlockId) {
				setValue('fixed_block_id', null, { shouldDirty: true });
			}
			setBillingInteractionRequired(false);
			return;
		}

		const mode = selectedProjectDetails?.billing_mode ?? 'LOPANDE_ONLY';

		if (mode === 'FAST_ONLY') {
			setBillingInteractionRequired(false);
			if (billingType !== 'FAST') {
				setValue('billing_type', 'FAST', { shouldDirty: true });
			}
			if (fixedBlockId) {
				setValue('fixed_block_id', null, { shouldDirty: true });
			}
			return;
		}

		if (mode === 'LOPANDE_ONLY') {
			setBillingInteractionRequired(false);
			if (billingType !== 'LOPANDE') {
				setValue('billing_type', 'LOPANDE', { shouldDirty: true });
			}
			if (fixedBlockId) {
				setValue('fixed_block_id', null, { shouldDirty: true });
			}
			return;
		}

		// mode === 'BOTH'
		const hasSelection = billingType === 'FAST' || billingType === 'LOPANDE';
		setBillingInteractionRequired(!hasSelection);

		if (!hasSelection) {
			if (fixedBlockId) {
				setValue('fixed_block_id', null, { shouldDirty: true });
			}
			return;
		}

		if (billingType !== 'FAST' && fixedBlockId) {
			setValue('fixed_block_id', null, { shouldDirty: true });
		}
	}, [
		billingType,
		fixedBlockId,
		selectedProjectDetails,
		selectedProjectId,
		setValue,
		fixedBlocks.length,
		projects?.length,
		effectiveBillingMode,
	]);

	// Fetch all org members for user filter (only if admin/foreman/finance)
	const { data: orgMembers } = useQuery<OrgMember[]>({
		queryKey: ['org-members', orgId],
		queryFn: async () => {
			if (!canSeeAllEntries) return [];
			const response = await fetch('/api/organizations/members');
			if (!response.ok) return [];
			const data = await response.json();
			return data.members || [];
		},
		enabled: canSeeAllEntries,
		staleTime: 5 * 60 * 1000,
	});

	// Build API URL with filters
	const buildEntriesUrl = () => {
		const params = new URLSearchParams();
		// Only filter by user_id if:
		// 1. User is a worker (always filter to own entries)
		// 2. User selected a specific user in filter
		if (!canSeeAllEntries) {
			params.append('user_id', userId);
		} else if (filterUserId) {
			params.append('user_id', filterUserId);
		}
		params.append('limit', '500');
		if (filterProject) params.append('project_id', filterProject);
		if (filterStatus) params.append('status', filterStatus);
		if (filterStartDate) params.append('start_date', filterStartDate);
		if (filterEndDate) params.append('end_date', filterEndDate);
		return `/api/time/entries?${params.toString()}`;
	};

	// Fetch time entries for stats and list
	const { data: timeEntries, refetch } = useQuery({
		queryKey: ['time-entries-stats', orgId, userId, userRole, filterProject, filterStatus, filterUserId, filterStartDate, filterEndDate],
		queryFn: async () => {
			const response = await fetch(buildEntriesUrl());
			if (!response.ok) throw new Error('Failed to fetch time entries');
			const data = await response.json();
			return data.entries || [];
		},
		staleTime: 0,                // Always refetch to show latest entries
		gcTime: 5 * 60 * 1000,       // 5 minutes
	});

	// Fetch diary entries to check which ones exist for displayed time entries
	const { data: diaryEntries } = useQuery({
		queryKey: ['diary-entries-check', orgId],
		queryFn: async () => {
			const response = await fetch('/api/diary');
			if (!response.ok) return [];
			const data = await response.json();
			return data.diary || [];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes
		gcTime: 5 * 60 * 1000,
	});

	// Create a Set for quick lookup: "project_id:user_id:date" -> true
	const diaryExistsMap = useMemo(() => {
		if (!diaryEntries || !timeEntries) return new Set<string>();
		const map = new Set<string>();
		diaryEntries.forEach((diary: any) => {
			if (!diary.project_id || !diary.created_by || !diary.date) return;
			const key = `${diary.project_id}:${diary.created_by}:${diary.date}`;
			map.add(key);
		});
		return map;
	}, [diaryEntries, timeEntries]);

	// Helper function to check if diary exists for a time entry
	const hasDiaryEntry = (entry: any): boolean => {
		if (!entry.project_id) return false;
		const entryUserId = entry.user_id ?? entry.user?.id;
		if (!entryUserId) return false;
		const entryDate = new Date(entry.start_at).toISOString().split('T')[0];
		const key = `${entry.project_id}:${entryUserId}:${entryDate}`;
		return diaryExistsMap.has(key);
	};

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
					billing_type: '',
					fixed_block_id: null,
				});
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

	const onSubmit = async (data: TimeEntryFormValues) => {
		if (!data.project_id || !data.start_at || !data.stop_at) {
			return;
		}

		const normalizedBillingType =
			data.billing_type === '' ? selectedProjectDetails?.default_time_billing_type ?? 'LOPANDE' : data.billing_type;

		const payload: CreateTimeEntryInput = {
			...data,
			project_id: String(data.project_id),
			billing_type: normalizedBillingType as BillingType,
			fixed_block_id: data.fixed_block_id ?? null,
		};

		setIsSubmitting(true);

		try {
			const isEditing = editingEntry !== null;
			const url = isEditing ? `/api/time/entries/${editingEntry.id}` : '/api/time/entries';
			const method = isEditing ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
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
			billing_type: '',
			fixed_block_id: null,
			});
			setEditingEntry(null);

			// Show diary prompt dialog like the slider
			if (data.project_id) {
				setCompletedProjectId(data.project_id);
				setShowDiaryPromptDialog(true);
			}
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

	const recentEntries = timeEntries || [];

	return (
		<div className='flex-1 overflow-auto bg-gray-50 pb-20 transition-colors md:pb-0 dark:bg-[#0A0908]'>
			{/* Filter Dialog */}
			<Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Filtrera registreringar</DialogTitle>
						<DialogDescription>
							Välj filter för att visa specifika tidsregistreringar
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4 mt-4'>
						{/* User Filter (only for admin/foreman/finance) */}
						{canSeeAllEntries && (
							<div>
								<label className='block text-sm font-medium mb-2'>Användare</label>
								<Select value={filterUserId || 'all'} onValueChange={(value) => setFilterUserId(value === 'all' ? '' : value)}>
									<SelectTrigger>
										<SelectValue placeholder='Alla användare' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>Alla användare</SelectItem>
										{orgMembers?.map((member) => (
											<SelectItem key={member.user_id} value={member.user_id}>
												{member.profiles.full_name} ({member.profiles.email})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Project Filter */}
						<div>
							<label className='block text-sm font-medium mb-2'>Projekt</label>
							<Select value={filterProject || 'all'} onValueChange={(value) => setFilterProject(value === 'all' ? '' : value)}>
								<SelectTrigger>
									<SelectValue placeholder='Alla projekt' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>Alla projekt</SelectItem>
									{projects?.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Status Filter */}
						<div>
							<label className='block text-sm font-medium mb-2'>Status</label>
							<Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}>
								<SelectTrigger>
									<SelectValue placeholder='Alla status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>Alla status</SelectItem>
									<SelectItem value='draft'>Utkast</SelectItem>
									<SelectItem value='submitted'>Inskickad</SelectItem>
									<SelectItem value='approved'>Godkänd</SelectItem>
									<SelectItem value='rejected'>Avvisad</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Date Range */}
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='block text-sm font-medium mb-2'>Från datum</label>
								<Input
									type='date'
									value={filterStartDate}
									onChange={(e) => setFilterStartDate(e.target.value)}
								/>
							</div>
							<div>
								<label className='block text-sm font-medium mb-2'>Till datum</label>
								<Input
									type='date'
									value={filterEndDate}
									onChange={(e) => setFilterEndDate(e.target.value)}
								/>
							</div>
						</div>

						<div className='flex gap-3 pt-4'>
							<Button
								variant='outline'
								onClick={() => {
									setFilterProject('');
									setFilterStatus('');
									setFilterUserId('');
									setFilterStartDate('');
									setFilterEndDate('');
								}}
								className='flex-1'
							>
								Rensa
							</Button>
							<Button
								onClick={() => setShowFilterDialog(false)}
								className='flex-1 bg-orange-500 hover:bg-orange-600 text-white'
							>
								Applicera
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Diary Prompt Dialog */}
			<Dialog open={showDiaryPromptDialog} onOpenChange={setShowDiaryPromptDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bra jobbat! 👏</DialogTitle>
						<DialogDescription>Din arbetstid har sparats.</DialogDescription>
					</DialogHeader>
					<div className='flex flex-col gap-3 mt-4'>
						<p className='text-sm text-muted-foreground'>Vill du uppdatera dagboken för detta projekt nu?</p>
						<div className='flex gap-3'>
							<Button variant='outline' onClick={() => setShowDiaryPromptDialog(false)} className='flex-1'>
								Inte nu
							</Button>
							{completedProjectId && (
								<Link href={`/dashboard/diary/new?project_id=${completedProjectId}`} className='flex-1' onClick={() => setShowDiaryPromptDialog(false)}>
									<Button className='w-full bg-orange-500 hover:bg-orange-600 text-white'>Skapa dagbokspost</Button>
								</Link>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-[var(--color-card)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-card)]/75 dark:bg-black dark:supports-[backdrop-filter]:bg-black/80'>
				<div className='px-4 py-4 md:px-8 md:py-6'>
					<div>
						<h1 className='mb-1 text-3xl font-bold text-foreground'>
							Manuell tidsregistrering
						</h1>
						<p className='text-sm text-muted-foreground'>
							Registrera tid som redan har arbetats
						</p>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8'>
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
										billing_type: '',
										fixed_block_id: null,
									});
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
									value={selectedProjectId || ''}
									onValueChange={(value) => {
										setValue('project_id', value, { shouldDirty: true });
										const projectMode = projects?.find((project) => String(project.id) === String(value))?.billing_mode;
										if (projectMode === 'FAST_ONLY') {
											setValue('billing_type', 'FAST', { shouldDirty: true });
										} else if (projectMode === 'LOPANDE_ONLY') {
											setValue('billing_type', 'LOPANDE', { shouldDirty: true });
										} else {
											setValue('billing_type', '', { shouldDirty: true });
										}
										setValue('fixed_block_id', null, { shouldDirty: true });
									}}
								>
									<SelectTrigger className='h-11 justify-between text-left'>
										<SelectValue placeholder='Välj projekt' />
									</SelectTrigger>
									<SelectContent className='border border-border/60 bg-[var(--color-card)] text-[var(--color-gray-900)] dark:border-[#3b291d] dark:bg-[#1a120d] dark:text-white'>
										{projects?.map((project) => (
											<SelectItem
												key={project.id}
												value={project.id}
												className='text-sm data-[state=checked]:bg-orange-500/15 data-[state=checked]:text-orange-600 dark:data-[state=checked]:bg-[#3a251c] dark:data-[state=checked]:text-[#f8ddba]'
											>
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

						{/* Billing Type */}
						{selectedProjectId && (
							<div>
								<label className='block text-sm font-medium mb-2'>
									Debitering {effectiveBillingMode === 'BOTH' && <span className='text-destructive'>*</span>}
								</label>
								{effectiveBillingMode === 'BOTH' ? (
									<Select
										value={billingType || ''}
										onValueChange={(value) => {
											const normalized = value as BillingType;
											setValue('billing_type', normalized, { shouldDirty: true });
											if (normalized !== 'FAST') {
												setValue('fixed_block_id', null, { shouldDirty: true });
											}
										}}
									>
										<SelectTrigger className={!billingType ? 'h-11 border-destructive' : 'h-11'}>
											<SelectValue placeholder='Välj debitering' />
										</SelectTrigger>
										<SelectContent>
											{billingTypeOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : effectiveBillingMode === 'FAST_ONLY' ? (
									<div className='rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
										Debitering: Fast
									</div>
								) : (
									<div className='rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
										Debitering: Löpande
									</div>
								)}
								{billingInteractionRequired && !billingType && (
									<p className='text-sm text-destructive mt-1'>Välj debitering innan du sparar.</p>
								)}
							</div>
						)}

						{/* Fixed block selection */}
						{selectedProjectId &&
							((billingType === 'FAST' && effectiveBillingMode === 'BOTH') || effectiveBillingMode === 'FAST_ONLY') && (
								<div>
									<label className='block text-sm font-medium mb-2'>
										Fast post {hasFixedBlocks && <span className='text-destructive'>*</span>}
									</label>
									{fixedBlocksLoading ? (
										<div className='flex items-center gap-2 text-sm text-muted-foreground'>
											<Loader2 className='w-4 h-4 animate-spin' />
											Laddar fasta poster...
										</div>
									) : hasFixedBlocks ? (
										<Select
											value={fixedBlockId || ''}
											onValueChange={(value) => {
												setValue('fixed_block_id', value ? String(value) : null, { shouldDirty: true });
											}}
										>
											<SelectTrigger className='h-11'>
												<SelectValue placeholder='Välj fast post' />
											</SelectTrigger>
											<SelectContent>
												{fixedBlocks.map((block) => (
													<SelectItem key={block.id} value={block.id}>
														{block.name} ({Math.round(Number(block.amount_sek || 0))} SEK)
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<div className='rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
											Inga fasta poster i projektet – debiteringen kopplas till huvudprojektets fasta budget.
										</div>
									)}
									{fixedBlocksErrorMessage && (
										<p className='text-sm text-destructive mt-1'>{fixedBlocksErrorMessage}</p>
									)}
									{errors.fixed_block_id && (
										<p className='text-sm text-destructive mt-1'>{errors.fixed_block_id.message}</p>
									)}
									{hasFixedBlocks && (
										<p className='text-xs text-muted-foreground mt-1'>
											Fast tid måste kopplas till en fast fakturapost.
										</p>
									)}
								</div>
							)}

						{/* Date */}
						<div>
							<label className='block text-sm font-medium mb-2'>
								Datum <span className='text-destructive'>*</span>
							</label>
							<div className='relative'>
								<Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none hidden md:block' />
								<Input
									type='date'
									value={currentDate}
									onChange={(e) => {
										const date = e.target.value;
										setCurrentDate(date);
									}}
									className='md:pl-9 h-11'
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

						{process.env.NODE_ENV !== 'production' && (
							<pre className='bg-muted/40 border border-dashed border-border/60 text-xs text-muted-foreground rounded-lg p-3 max-h-48 overflow-auto'>
								{JSON.stringify(
									{
										rhf: {
											project_id: selectedProjectId || null,
											billing_type: billingType || null,
											fixed_block_id: fixedBlockId || null,
										},
										effectiveBillingMode,
										fixedBlocksCount: fixedBlocks.length,
									},
									null,
									2,
								)}
							</pre>
						)}

					{/* Description removed: we prompt for diary update after save */}

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
						<div className='flex items-center gap-2'>
							{(filterProject || filterStatus || filterUserId || filterStartDate || filterEndDate) && (
								<Button
									variant='ghost'
									size='sm'
									onClick={() => {
										setFilterProject('');
										setFilterStatus('');
										setFilterUserId('');
										setFilterStartDate('');
										setFilterEndDate('');
									}}
									className='text-xs'
								>
									Rensa filter
								</Button>
							)}
							<Button variant='outline' size='sm' onClick={() => setShowFilterDialog(true)}>
								<Filter className='w-4 h-4 mr-2' />
								Filter
							</Button>
						</div>
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
							recentEntries.map((entry: any) => {
								const billingTypeLabel = entry.billing_type === 'FAST' ? 'Fast' : 'Löpande';
								const billingBadgeClasses =
									entry.billing_type === 'FAST'
										? 'bg-orange-500/20 text-orange-700 border-orange-300 dark:bg-[#3a251c] dark:text-[#f8ddba] dark:border-[#4a2f22]'
										: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700';

								return (
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
														<div className='mb-1 flex items-center gap-2'>
															<h4 className='font-semibold text-base truncate'>
																{entry.project?.name || 'Okänt projekt'}
															</h4>
															<span
																className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${billingBadgeClasses}`}
															>
																{billingTypeLabel}
															</span>
														</div>
														{entry.user?.full_name && (
															<p className='text-sm font-medium text-muted-foreground mb-1'>
																{entry.user.full_name}
															</p>
														)}
														{entry.task_label &&
															entry.task_label.trim() !== '' &&
															entry.task_label.toLowerCase() !== 'ingen beskrivning' && (
																<p className='text-sm text-muted-foreground'>
																	{entry.task_label}
																</p>
															)}
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
												<div className='flex items-center gap-2'>
													{/* Diary Button - always visible */}
													<Button
														variant={hasDiaryEntry(entry) ? 'default' : 'outline'}
														size='sm'
														className={
															hasDiaryEntry(entry)
																? 'flex h-9 w-9 items-center justify-center rounded-full border-green-300 bg-green-50 text-green-700 transition-all duration-200 hover:bg-green-100 md:w-auto md:px-4 md:gap-2'
																: 'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 md:w-auto md:px-4 md:gap-2'
														}
														onClick={() => handleDiaryClick(entry)}
														disabled={diaryLoadingMap[entry.id] || !entry.project_id}
														title='Dagbok'
													>
														{diaryLoadingMap[entry.id] ? (
															<Loader2 className='h-4 w-4 animate-spin' />
														) : (
															<>
																{hasDiaryEntry(entry) ? (
																	<CheckCircle2 className='h-4 w-4' />
																) : (
																	<BookOpen className='h-4 w-4' />
																)}
																<span className='hidden md:inline'>Dagbok</span>
															</>
														)}
													</Button>

													{entry.status === 'draft' && (
														<>
															<Button
																variant='outline'
																size='sm'
																className='flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 md:w-auto md:px-4 md:gap-2'
																onClick={() => {
																	setEditingEntry(entry);
																	window.scrollTo({ top: 0, behavior: 'smooth' });
																}}
																title='Ändra'
															>
																<Pencil className='h-4 w-4' />
																<span className='hidden md:inline'>Ändra</span>
															</Button>
															<Button
																variant='outline'
																size='sm'
																className='flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 md:w-auto md:px-4 md:gap-2'
																onClick={() => handleDelete(entry.id)}
																title='Ta bort'
															>
																<Trash2 className='h-4 w-4' />
																<span className='hidden md:inline'>Ta bort</span>
															</Button>
														</>
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})
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

