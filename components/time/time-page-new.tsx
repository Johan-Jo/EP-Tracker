'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { AtaHoursPicker } from '@/components/ui/ata-hours-picker';
import { DatePickerInput } from '@/components/ui/date-picker-input';

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

interface AtaOption {
	id: string;
	title: string;
	status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced';
	billing_type: BillingType;
	created_at: string;
}

type TimeEntryFormValues = Omit<CreateTimeEntryInput, 'billing_type' | 'fixed_block_id'> & {
	billing_type: '' | BillingType;
	fixed_block_id: string | null;
	hours?: number; // For ÄTA entries
};

// Helper function to get default work times from organization settings
function getDefaultWorkTimes(orgBreakSettings?: {
	default_work_day_start?: string;
	default_work_day_end?: string;
}) {
	if (orgBreakSettings) {
		return {
			start: orgBreakSettings.default_work_day_start || '07:00',
			end: orgBreakSettings.default_work_day_end || '16:00',
		};
	}
	return { start: '07:00', end: '16:00' };
}

export function TimePageNew({ orgId, userId, userRole, projectId }: TimePageNewProps) {
	// FORCE LOG on component mount - Always show
	useEffect(() => {
		console.warn('🚀 [TimePageNew] COMPONENT MOUNTED', { orgId, userId, userRole, projectId });
	}, []);

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
	const [entriesLimit, setEntriesLimit] = useState(200);
	const [ataMinutes, setAtaMinutes] = useState(0); // Minutes to discount from main project time (0-1440 for 0-24 hours)
	const supabase = createClient();
	const queryClient = useQueryClient();
	const isSubmittingRef = useRef(false); // Prevent double submission
	
	// Check if user can see all entries (admin/foreman/finance)
	const canSeeAllEntries = userRole === 'admin' || userRole === 'foreman' || userRole === 'finance';

	// Fetch organization break settings and work hours (must be before useEffect that uses it)
	const { data: orgBreakSettings } = useQuery<{
		standard_break_minutes_per_day: number;
		standard_breaks: Array<{ label: string; start: string; end: string; duration_minutes: number }>;
		default_work_day_start: string;
		default_work_day_end: string;
	}>({
		queryKey: ['org-break-settings', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('organizations')
				.select('standard_break_minutes_per_day, standard_breaks, default_work_day_start, default_work_day_end')
				.eq('id', orgId)
				.single();

			if (error) throw error;
			return {
				standard_break_minutes_per_day: data?.standard_break_minutes_per_day ?? 0,
				standard_breaks: (data?.standard_breaks as any) ?? [],
				default_work_day_start: data?.default_work_day_start ?? '07:00',
				default_work_day_end: data?.default_work_day_end ?? '16:00',
			};
		},
		staleTime: 10 * 60 * 1000,  // 10 minutes (rarely changes)
		gcTime: 30 * 60 * 1000,     // 30 minutes
	});
	
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
			// If diary entry already loaded with this time entry, go directly
			if (entry.diary_entry?.id) {
				window.location.href = `/dashboard/diary/${entry.diary_entry.id}?edit=1`;
				return;
			}

			// Otherwise, check if diary entry exists for this project and date
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
	
	// Helper function to always get today's date
	const getTodayDate = () => {
		const today = new Date();
		return today.toISOString().split('T')[0];
	};
	
	// Initialize with today's date - force it to be today
	const [currentDate, setCurrentDate] = useState(() => getTodayDate());
	
	// Force today's date on mount and whenever not editing
	useEffect(() => {
		if (!editingEntry) {
			const today = getTodayDate();
			// Always set to today, don't check if it's different
			setCurrentDate(today);
		}
	}, []); // Run on mount
	const [startTime, setStartTime] = useState('');
	const [endTime, setEndTime] = useState('');
	const [hours, setHours] = useState<number | undefined>(undefined);

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
			start_at: new Date().toISOString().split('T')[0] + 'T07:00',
			project_id: '',
			phase_id: null,
			task_label: '',
			billing_type: '',
			fixed_block_id: null,
			stop_at: null,
			ata_id: null,
			hours: undefined,
		},
	});

	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setValue('project_id', projectId, { shouldDirty: true });
		}
	}, [projectId, setValue]);

	// Set default start and end times from organization settings when loaded
	useEffect(() => {
		if (orgBreakSettings && !editingEntry) {
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			
			// Only set if not already set by user
			if (!startTime) {
				setStartTime(defaults.start);
			}
			if (!endTime) {
				setEndTime(defaults.end);
			}
		}
	}, [orgBreakSettings, editingEntry, startTime, endTime]);

	// Recalculate ÄTA minutes when orgBreakSettings loads and we're editing an entry with ÄTA
	useEffect(() => {
		if (editingEntry && editingEntry.ata_id && editingEntry.stop_at && orgBreakSettings) {
			const startDate = new Date(editingEntry.start_at);
			const stopDate = new Date(editingEntry.stop_at);
			const totalMinutes = Math.floor((stopDate.getTime() - startDate.getTime()) / (1000 * 60));
			const workMinutes = editingEntry.duration_min || 0;
			const breakMinutes = calculateBreakMinutes(startDate, stopDate);
			const calculatedAtaMinutes = Math.max(0, totalMinutes - workMinutes - breakMinutes);
			setAtaMinutes(calculatedAtaMinutes);
		}
	}, [editingEntry, orgBreakSettings]);

	// Initialize start_at on mount and when date/time changes
	useEffect(() => {
		if (startTime) {
			setValue('start_at', `${currentDate}T${startTime}`);
		} else if (orgBreakSettings) {
			// If no start time set, use default from organization
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			setStartTime(defaults.start);
			setValue('start_at', `${currentDate}T${defaults.start}`);
		}
	}, [currentDate, startTime, setValue, orgBreakSettings]);

	// Update stop_at when date changes (FIX: Prevents wrong duration calculation)
	useEffect(() => {
		if (endTime) {
			setValue('stop_at', `${currentDate}T${endTime}`);
		} else if (orgBreakSettings) {
			// If no end time set, use default from organization
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			setEndTime(defaults.end);
			setValue('stop_at', `${currentDate}T${defaults.end}`);
		}
	}, [currentDate, endTime, setValue, orgBreakSettings]);

	const watchedProjectId = watch('project_id');
	const selectedProjectId = watchedProjectId ? String(watchedProjectId) : '';
	const billingType = watch('billing_type') as TimeEntryFormValues['billing_type'];
	const fixedBlockId = watch('fixed_block_id') as TimeEntryFormValues['fixed_block_id'];
const selectedAtaId = watch('ata_id') as string | null;
const previousProjectIdRef = useRef<string | null>(null);

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
			setValue('ata_id', editingEntry.ata_id ?? null, { shouldDirty: true });
			
			// Calculate ÄTA minutes from entry data
			// For grouped entries, use the ÄTA entry's duration directly
			if (editingEntry._grouped && editingEntry._ataEntry) {
				setAtaMinutes(editingEntry._ataEntry.duration_min || 0);
			} else if (editingEntry.ata_id && stopDate) {
				// Wait for orgBreakSettings to load if not available yet
				if (orgBreakSettings) {
					const totalMinutes = Math.floor((stopDate.getTime() - startDate.getTime()) / (1000 * 60));
					const workMinutes = editingEntry.duration_min || 0;
					const breakMinutes = calculateBreakMinutes(startDate, stopDate);
					// ÄTA minutes = total - work - break
					const calculatedAtaMinutes = Math.max(0, totalMinutes - workMinutes - breakMinutes);
					setAtaMinutes(calculatedAtaMinutes);
				} else {
					// If orgBreakSettings not loaded yet, set to 0 temporarily
					// It will be recalculated when orgBreakSettings loads
					setAtaMinutes(0);
				}
			} else {
				setAtaMinutes(0);
			}
		}
	}, [editingEntry, setValue, orgBreakSettings]);

	// Always ensure date is today when form is not in edit mode
	useEffect(() => {
		if (!editingEntry) {
			const today = getTodayDate();
			// Force set to today, don't check current value
			setCurrentDate(today);
		}
	}, [editingEntry]);

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

const { data: ataOptions = [], isLoading: ataLoading } = useQuery<AtaOption[]>({
	queryKey: ['project-ata-options', selectedProjectId],
	queryFn: async () => {
		if (!selectedProjectId) return [];
		const { data, error } = await supabase
			.from('ata')
			.select('id, title, status, billing_type, created_at')
			.eq('project_id', selectedProjectId)
			.not('status', 'eq', 'rejected')
			.order('created_at', { ascending: false });

		if (error) throw error;
		return data ?? [];
	},
	enabled: Boolean(selectedProjectId),
	staleTime: 60 * 1000,
});

useEffect(() => {
	const previousProjectId = previousProjectIdRef.current;
	if (!selectedProjectId) {
		if (selectedAtaId) {
			setValue('ata_id', null, { shouldDirty: true });
		}
		setAtaMinutes(0); // Reset ÄTA minutes when project changes
	} else if (previousProjectId && previousProjectId !== selectedProjectId) {
		setValue('ata_id', null, { shouldDirty: true });
		setAtaMinutes(0); // Reset ÄTA minutes when project changes
	}
	previousProjectIdRef.current = selectedProjectId || null;
}, [selectedProjectId, selectedAtaId, setValue]);

// Reset ÄTA minutes when ÄTA selection changes
useEffect(() => {
	if (!selectedAtaId || selectedAtaId === 'none') {
		setAtaMinutes(0);
	}
}, [selectedAtaId]);

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
		params.append('limit', String(entriesLimit));
		if (filterProject) params.append('project_id', filterProject);
		if (filterStatus) params.append('status', filterStatus);
		if (filterStartDate) params.append('start_date', filterStartDate);
		if (filterEndDate) params.append('end_date', filterEndDate);
		return `/api/time/entries?${params.toString()}`;
	};

	// ✅ PERFORMANCE: Fetch time entries with stats from server
	// Stats are calculated server-side for better performance
	const { data: timeEntriesData, refetch, isFetching: isFetchingEntries, error: entriesError } = useQuery({
		queryKey: ['time-entries-stats', orgId, userId, userRole, filterProject, filterStatus, filterUserId, filterStartDate, filterEndDate, entriesLimit],
		queryFn: async () => {
			// FORCE LOG - Always show, even in production
			console.warn('🔍 [TimePageNew] STARTING FETCH', { orgId, userId, userRole });
			
			const url = buildEntriesUrl();
			// Add include_stats parameter to get server-side calculated stats
			const urlWithStats = url.includes('?') ? `${url}&include_stats=true` : `${url}?include_stats=true`;
			
			console.warn('🔍 [TimePageNew] Fetching from:', urlWithStats);
			if (typeof window !== 'undefined') {
				console.warn('🔍 [TimePageNew] Full URL:', window.location.origin + urlWithStats);
			}
			
			try {
			const response = await fetch(urlWithStats);
				console.warn('🔍 [TimePageNew] Response status:', response.status, response.statusText);
				
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ error: 'Failed to parse error' }));
					console.error('❌ [TimePageNew] API ERROR:', response.status, errorData);
					throw new Error(errorData.error || `Failed to fetch time entries: ${response.status}`);
				}
				
			const data = await response.json();
				console.warn('✅ [TimePageNew] API SUCCESS:', {
					entriesCount: data.entries?.length || 0,
					hasStats: !!data.stats,
					firstEntry: data.entries?.[0]?.id,
					allEntries: data.entries
				});
				
			return {
				entries: data.entries || [],
				stats: data.stats || null, // Server-calculated stats
			};
			} catch (error) {
				console.error('❌ [TimePageNew] FETCH ERROR:', error);
				throw error;
			}
		},
		staleTime: 30 * 1000,       // ✅ PERFORMANCE: 30 seconds (entries change but not constantly)
		gcTime: 5 * 60 * 1000,       // 5 minutes
	});

	const timeEntries = timeEntriesData?.entries || [];
	const serverStats = timeEntriesData?.stats;

	// Handle error in render path - show friendly error UI instead of crashing
	if (entriesError) {
		console.error('[TimePageNew] Failed to load time entries', entriesError);

		return (
			<div className='p-4 md:p-8 border border-red-300 rounded bg-red-50 text-red-800'>
				<p className='font-semibold'>Kunde inte hämta tidrapporter.</p>
				<p className='text-sm mt-1'>
					Ladda om sidan eller försök igen senare. Om felet kvarstår, kolla loggarna för /api/time/entries.
				</p>
				<button
					className='mt-2 text-sm underline'
					type='button'
					onClick={() => refetch()}
				>
					Försök igen
				</button>
			</div>
		);
	}

	// Group related entries (main project + ÄTA) that belong together
	const groupedEntries = useMemo(() => {
		// Simple approach: find pairs of entries (main + ÄTA) and group them
		const result: any[] = [];
		const processed = new Set<string>();
		
		timeEntries.forEach((entry: any) => {
			if (processed.has(entry.id)) return;
			
			// Normalize timestamps for comparison (remove milliseconds and timezone differences)
			const normalizeTime = (timeStr: string | null) => {
				if (!timeStr) return '';
				return new Date(timeStr).toISOString().slice(0, 19).replace('T', ' ');
			};
			
			// If this is an ÄTA entry, look for matching main entry
			if (entry.ata_id) {
				const mainEntry = timeEntries.find((e: any) => 
					!e.ata_id &&
					e.project_id === entry.project_id &&
					e.user_id === entry.user_id &&
					normalizeTime(e.start_at) === normalizeTime(entry.start_at) &&
					normalizeTime(e.stop_at) === normalizeTime(entry.stop_at) &&
					!processed.has(e.id)
				);
				
				if (mainEntry) {
					// Group them
					result.push({
						...mainEntry,
						_grouped: true,
						_ataEntry: entry,
						_mainDuration: mainEntry.duration_min || 0,
						_ataDuration: entry.duration_min || 0,
						_totalDuration: (mainEntry.duration_min || 0) + (entry.duration_min || 0),
						_entryIds: [mainEntry.id, entry.id]
					});
					processed.add(mainEntry.id);
					processed.add(entry.id);
				} else {
					// Single ÄTA entry
					result.push(entry);
					processed.add(entry.id);
				}
			} else {
				// If this is a main entry, look for matching ÄTA entry
				const normalizeTime = (timeStr: string | null) => {
					if (!timeStr) return '';
					return new Date(timeStr).toISOString().slice(0, 19).replace('T', ' ');
				};
				
				const ataEntry = timeEntries.find((e: any) => 
					e.ata_id &&
					e.project_id === entry.project_id &&
					e.user_id === entry.user_id &&
					normalizeTime(e.start_at) === normalizeTime(entry.start_at) &&
					normalizeTime(e.stop_at) === normalizeTime(entry.stop_at) &&
					!processed.has(e.id)
				);
				
				if (ataEntry) {
					// Group them
					result.push({
						...entry,
						_grouped: true,
						_ataEntry: ataEntry,
						_mainDuration: entry.duration_min || 0,
						_ataDuration: ataEntry.duration_min || 0,
						_totalDuration: (entry.duration_min || 0) + (ataEntry.duration_min || 0),
						_entryIds: [entry.id, ataEntry.id]
					});
					processed.add(entry.id);
					processed.add(ataEntry.id);
				} else {
					// Single main entry
					result.push(entry);
					processed.add(entry.id);
				}
			}
		});
		
		// Sort by start_at descending
		return result.sort((a, b) => {
			const startAtA = new Date(a.start_at).getTime();
			const startAtB = new Date(b.start_at).getTime();
			if (startAtB !== startAtA) {
				return startAtB - startAtA;
			}
			const createdAtA = new Date(a.created_at).getTime();
			const createdAtB = new Date(b.created_at).getTime();
			return createdAtB - createdAtA;
		});
	}, [timeEntries]);

	// FORCE LOG - Always show, even in production
	useEffect(() => {
		console.warn('🔍 [TimePageNew] STATE UPDATE:', {
			timeEntriesCount: timeEntries.length,
			groupedEntriesCount: groupedEntries.length,
			orgId,
			userId,
			userRole,
			filterProject,
			filterStatus,
			filterUserId,
			filterStartDate,
			filterEndDate,
			entriesError: entriesError?.message,
			isFetching: isFetchingEntries,
			hasData: !!timeEntriesData
		});
	}, [timeEntries.length, groupedEntries.length, orgId, userId, userRole, filterProject, filterStatus, filterUserId, filterStartDate, filterEndDate, entriesError, isFetchingEntries, timeEntriesData]);

	// Helper function to check if diary exists for a time entry
	const hasDiaryEntry = (entry: any): boolean => Boolean(entry?.diary_entry?.id);

	// ✅ PERFORMANCE: Use server-calculated stats if available, otherwise calculate client-side
	// Server-side calculation is much faster for large datasets
	const stats = useMemo(() => {
		// If server provided stats, use them (much faster!)
		if (serverStats) {
			return serverStats;
		}

		// Fallback to client-side calculation if server stats not available
		if (!timeEntries || timeEntries.length === 0) {
			return { today: 0, yesterday: 0, thisWeek: 0, thisMonth: 0 };
		}

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
	}, [timeEntries, serverStats]);

	// ✅ PERFORMANCE: Memoize formatDuration to avoid recreating function on every render
	const formatDuration = useCallback((minutes: number): string => {
		if (!minutes || minutes <= 0) return '0min';
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		if (hours === 0) return `${mins}min`;
		if (mins === 0) return `${hours}h`;
		return `${hours}h ${mins}min`;
	}, []);

	// Format duration without showing 0min (for breakdown display)
	const formatDurationNoZeroMin = useCallback((minutes: number): string => {
		if (!minutes) return '0h';
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		if (mins === 0) return `${hours}h`;
		return `${hours}h ${mins}min`;
	}, []);

	// Calculate break minutes to deduct based on time range
	const calculateBreakMinutes = (start: Date, end: Date): number => {
		if (!orgBreakSettings) return 0;

		// If we have specific breaks defined, calculate based on those
		if (orgBreakSettings.standard_breaks && orgBreakSettings.standard_breaks.length > 0) {
			let totalBreakMinutes = 0;
			const startTimeStr = start.toTimeString().slice(0, 5); // HH:mm format
			const endTimeStr = end.toTimeString().slice(0, 5);

			for (const breakItem of orgBreakSettings.standard_breaks) {
				const breakStart = breakItem.start; // Expected format: "HH:mm"
				const breakEnd = breakItem.end;

				// Check if the work period overlaps with this break
				// Break should be deducted if work period covers any part of the break
				if (startTimeStr <= breakEnd && endTimeStr >= breakStart) {
					// Calculate how much of the break overlaps with work period
					const workStartMinutes = start.getHours() * 60 + start.getMinutes();
					const workEndMinutes = end.getHours() * 60 + end.getMinutes();
					const [breakStartH, breakStartM] = breakStart.split(':').map(Number);
					const [breakEndH, breakEndM] = breakEnd.split(':').map(Number);
					const breakStartMinutes = breakStartH * 60 + breakStartM;
					const breakEndMinutes = breakEndH * 60 + breakEndM;

					// Calculate overlap
					const overlapStart = Math.max(workStartMinutes, breakStartMinutes);
					const overlapEnd = Math.min(workEndMinutes, breakEndMinutes);

					if (overlapStart < overlapEnd) {
						// Use the break's duration_minutes if available, otherwise calculate from times
						totalBreakMinutes += breakItem.duration_minutes || (overlapEnd - overlapStart);
					}
				}
			}

			return totalBreakMinutes;
		}

		// Fallback to standard_break_minutes_per_day if no specific breaks defined
		// Only deduct if work period is long enough (e.g., more than 4 hours)
		const workMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
		if (workMinutes >= 240) { // 4 hours or more
			return orgBreakSettings.standard_break_minutes_per_day || 0;
		}

		return 0;
	};

	const calculateDuration = () => {
		// If ÄTA is selected, use hours directly
		if (selectedAtaId && selectedAtaId !== 'none' && hours) {
			const totalMinutes = Math.round(hours * 60);
			const hoursPart = Math.floor(totalMinutes / 60);
			const minutesPart = totalMinutes % 60;
			return `${hoursPart}h ${minutesPart}min`;
		}
		
		// Otherwise calculate from start/stop times
		if (!startTime || !endTime) return '';
		
		const start = new Date(`${currentDate}T${startTime}`);
		const end = new Date(`${currentDate}T${endTime}`);
		const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
		
		if (totalMinutes <= 0) return '';
		
		// Deduct break minutes
		const breakMinutes = calculateBreakMinutes(start, end);
		let workMinutes = Math.max(0, totalMinutes - breakMinutes);
		
		// Note: ÄTA minutes are NOT deducted here - API will create two separate entries
		// This calculation shows the total work time that will be split between main project and ÄTA
		
		if (workMinutes <= 0) return '';
		
		const calculatedHours = Math.floor(workMinutes / 60);
		const minutes = workMinutes % 60;
		return `${calculatedHours}h ${minutes}min`;
	};

	const handleDelete = (entry: any) => {
		// For grouped entries, store both entry IDs
		if (entry._grouped && entry._entryIds) {
			setEntryToDelete(JSON.stringify({ grouped: true, ids: entry._entryIds }));
		} else {
			setEntryToDelete(entry.id);
		}
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!entryToDelete) return;

		try {
			// Check if it's a grouped entry
			let deleteData: { grouped: boolean; ids?: string[]; id?: string };
			try {
				deleteData = JSON.parse(entryToDelete);
			} catch {
				deleteData = { grouped: false, id: entryToDelete };
			}

			if (deleteData.grouped && deleteData.ids) {
				// Delete both entries
				await Promise.all(
					deleteData.ids.map(id =>
						fetch(`/api/time/entries/${id}`, { method: 'DELETE' })
					)
				);
			} else if (deleteData.id) {
				// Delete single entry
				const response = await fetch(`/api/time/entries/${deleteData.id}`, {
					method: 'DELETE',
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to delete time entry');
				}
			}

			// If we were editing this entry, clear the editing state
			const entryIdToCheck = deleteData.grouped ? deleteData.ids?.[0] : deleteData.id;
			if (editingEntry?.id === entryIdToCheck) {
				setEditingEntry(null);
				const today = new Date().toISOString().split('T')[0];
				const defaults = getDefaultWorkTimes(orgBreakSettings);
				setCurrentDate(today);
				setStartTime(defaults.start);
				setEndTime(defaults.end);
				setAtaMinutes(0); // Reset ÄTA minutes
				reset({
					project_id: '',
					phase_id: null,
					task_label: '',
					start_at: `${today}T${defaults.start}`,
					stop_at: `${today}T${defaults.end}`,
					billing_type: '',
					fixed_block_id: null,
				});
			}

			// Invalidate cache and refetch - use more specific matching to ensure all related queries are invalidated
			await queryClient.invalidateQueries({ 
				queryKey: ['time-entries-stats'],
				exact: false 
			});
			await refetch();
			
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
		// Prevent double submission using ref (synchronous check)
		if (isSubmittingRef.current || isSubmitting) {
			return;
		}

		// Set ref immediately to prevent double submission
		isSubmittingRef.current = true;
		setIsSubmitting(true);

		const normalizedBillingType =
			data.billing_type === '' ? selectedProjectDetails?.default_time_billing_type ?? 'LOPANDE' : data.billing_type;

		let payload: CreateTimeEntryInput;
		
		// If ÄTA is selected, use hours instead of start_at/stop_at
		if (data.ata_id && hours) {
			// For ÄTA entries, set start_at to today at 00:00 and calculate stop_at based on hours
			const today = new Date(currentDate);
			today.setHours(0, 0, 0, 0);
			const stopAt = new Date(today);
			stopAt.setHours(today.getHours() + hours);
			
			payload = {
				...data,
				project_id: String(data.project_id),
				billing_type: normalizedBillingType as BillingType,
				fixed_block_id: data.fixed_block_id ?? null,
				ata_id: data.ata_id,
				start_at: today.toISOString(),
				stop_at: stopAt.toISOString(),
				hours: hours,
				ata_minutes: undefined, // Pure ÄTA entry, no deduction needed
			};
		} else {
			// Regular entry - require start_at and stop_at
			if (!data.project_id || !data.start_at || !data.stop_at) {
				isSubmittingRef.current = false;
				setIsSubmitting(false);
				return;
			}
			
			payload = {
				...data,
				project_id: String(data.project_id),
				billing_type: normalizedBillingType as BillingType,
				fixed_block_id: data.fixed_block_id ?? null,
				ata_id: data.ata_id ?? null,
				ata_minutes: (data.ata_id && ataMinutes > 0) ? ataMinutes : undefined, // Send ÄTA minutes to deduct
			};
		}

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

			const result = await response.json();
			
			// Handle case where API returns multiple entries (main project + ÄTA)
			if (result.entries && Array.isArray(result.entries)) {
				// Multiple entries created (main project + ÄTA)
				toast.success(result.message || 'Tidrapport och ÄTA-post skapade');
			} else if (result.entry) {
				// Single entry created
				toast.success(isEditing ? 'Tidrapport uppdaterad' : 'Tidrapport sparad');
			} else {
				// Fallback
				toast.success(isEditing ? 'Tidrapport uppdaterad' : 'Tidrapport sparad');
			}

			// Invalidate cache and refetch - use more specific matching to ensure all related queries are invalidated
			await queryClient.invalidateQueries({ 
				queryKey: ['time-entries-stats'],
				exact: false 
			});
			await refetch();

			// Reset form and editing state - always use today's date
			const today = new Date().toISOString().split('T')[0];
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			setCurrentDate(today);
			setStartTime(defaults.start);
			setEndTime(defaults.end);
			setAtaMinutes(0); // Reset ÄTA minutes
			reset({
				project_id: '',
				phase_id: null,
				task_label: '',
				notes: '',
				start_at: `${today}T${defaults.start}`,
				stop_at: `${today}T${defaults.end}`,
				billing_type: '',
				fixed_block_id: null,
				ata_id: null,
				hours: undefined,
			});
			setEditingEntry(null);

			// Show diary prompt dialog like the slider
			if (data.project_id) {
				setCompletedProjectId(data.project_id);
				setShowDiaryPromptDialog(true);
			}
		} catch (error) {
			console.error('Error saving time entry:', error);
			toast.error('Misslyckades att spara tidrapport');
		} finally {
			isSubmittingRef.current = false;
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

	const recentEntries = groupedEntries;
	const canLoadMoreEntries = recentEntries.length >= entriesLimit;

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
									const defaults = getDefaultWorkTimes(orgBreakSettings);
									setCurrentDate(today);
									setStartTime(defaults.start);
									setEndTime(defaults.end);
									setAtaMinutes(0); // Reset ÄTA minutes
									reset({
										project_id: '',
										phase_id: null,
										task_label: '',
										start_at: `${today}T${defaults.start}`,
										stop_at: `${today}T${defaults.end}`,
										notes: '',
										billing_type: '',
										fixed_block_id: null,
										ata_id: null,
										hours: undefined,
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
										setValue('ata_id', null, { shouldDirty: true });
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
							hasFixedBlocks &&
							((billingType === 'FAST' && effectiveBillingMode === 'BOTH') || effectiveBillingMode === 'FAST_ONLY') && (
								<div>
									<label className='block text-sm font-medium mb-2'>
										Fast post <span className='text-destructive'>*</span>
									</label>
									{fixedBlocksLoading ? (
										<div className='flex items-center gap-2 text-sm text-muted-foreground'>
											<Loader2 className='w-4 h-4 animate-spin' />
											Laddar fasta poster...
										</div>
									) : (
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
									)}
									{fixedBlocksErrorMessage && (
										<p className='text-sm text-destructive mt-1'>{fixedBlocksErrorMessage}</p>
									)}
									{errors.fixed_block_id && (
										<p className='text-sm text-destructive mt-1'>{errors.fixed_block_id.message}</p>
									)}
									<p className='text-xs text-muted-foreground mt-1'>
										Fast tid måste kopplas till en fast fakturapost.
									</p>
								</div>
							)}

						{/* ÄTA selection */}
						{selectedProjectId && (
							<div>
								<label className='block text-sm font-medium mb-2'>ÄTA (valfritt)</label>
								{ataLoading ? (
									<div className='flex items-center gap-2 text-sm text-muted-foreground'>
										<Loader2 className='w-4 h-4 animate-spin' />
										Laddar ÄTA...
									</div>
								) : ataOptions.length > 0 ? (
									<Select
										value={selectedAtaId ?? 'none'}
										onValueChange={(value) =>
											setValue('ata_id', value === 'none' ? null : value, { shouldDirty: true })
										}
									>
										<SelectTrigger className='h-11 justify-between text-left'>
										<SelectValue placeholder='Koppla till ÄTA (valfritt)' />
										</SelectTrigger>
										<SelectContent className='border border-border/60 bg-[var(--color-card)] text-[var(--color-gray-900)] dark:border-[#3b291d] dark:bg-[#1a120d] dark:text-white'>
											<SelectItem value='none'>Ingen ÄTA</SelectItem>
											{ataOptions.map((ata) => (
												<SelectItem
													key={ata.id}
													value={ata.id}
													className='text-sm data-[state=checked]:bg-orange-500/15 data-[state=checked]:text-orange-600 dark:data-[state=checked]:bg-[#3a251c] dark:data-[state=checked]:text-[#f8ddba]'
												>
													<div className='flex flex-col'>
														<span className='font-medium'>{ata.title}</span>
														<span className='text-xs text-muted-foreground'>
															{ata.status === 'approved'
																? 'Godkänd'
																: ata.status === 'submitted'
																? 'Väntar godkännande'
																: ata.status === 'draft'
																? 'Utkast'
																: ata.status === 'invoiced'
																? 'Fakturerad'
																: 'Avvisad'}{' '}
															· {ata.billing_type === 'FAST' ? 'Fast' : 'Löpande'}
														</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<div className='rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
										Inga ÄTA kopplade till projektet ännu.
										<div className='mt-2'>
											<Button variant='outline' size='sm' asChild>
												<Link href={`/dashboard/ata/new?project_id=${selectedProjectId}`}>
													Skapa ÄTA
												</Link>
											</Button>
										</div>
									</div>
								)}
								
							</div>
						)}

						{/* Date */}
						<DatePickerInput
							id="date"
							label="Datum"
							value={currentDate || getTodayDate()}
							onChange={(date) => {
								setCurrentDate(date);
								// Update start_at and stop_at when date changes
								if (startTime) {
									setValue('start_at', `${date}T${startTime}`);
								}
								if (endTime) {
									setValue('stop_at', `${date}T${endTime}`);
								}
							}}
							required
							error={errors.start_at?.message}
						/>

						{/* Time Range */}
						<div className='grid grid-cols-2 gap-4'>
							<TimePickerInput
								id="startTime"
								label="Starttid"
								value={startTime}
								onChange={(time) => {
									setStartTime(time);
									setValue('start_at', `${currentDate}T${time}`);
								}}
								required
								error={errors.start_at?.message}
							/>
							<TimePickerInput
								id="endTime"
								label="Sluttid"
								value={endTime}
								onChange={(time) => {
									setEndTime(time);
									if (time) {
										setValue('stop_at', `${currentDate}T${time}`);
									} else {
										setValue('stop_at', null);
									}
								}}
								required
								error={errors.stop_at?.message}
							/>
						</div>

						{/* Duration Display - only show when project is selected */}
						{selectedProjectId && calculateDuration() && (
							<div className='bg-orange-50 border-2 border-orange-200 rounded-lg p-3'>
								<div className='flex items-baseline gap-2'>
									<p className='text-sm text-muted-foreground'>Total tid</p>
									{(() => {
										// Calculate break minutes for display
										if (!startTime || !endTime) return null;
										const start = new Date(`${currentDate}T${startTime}`);
										const end = new Date(`${currentDate}T${endTime}`);
										const breakMinutes = calculateBreakMinutes(start, end);
										if (breakMinutes > 0) {
											const breakHours = Math.floor(breakMinutes / 60);
											const breakMins = breakMinutes % 60;
											const breakText = breakHours > 0 
												? `${breakHours}h ${breakMins}min`
												: `${breakMins}min`;
											return (
												<span className='text-xs text-muted-foreground'>
													(avdrag för rast: -{breakText})
												</span>
											);
										}
										return null;
									})()}
								</div>
								<p className='text-2xl font-semibold text-orange-600'>
									{calculateDuration()}
								</p>
							</div>
						)}

						{/* ÄTA Hours Picker - only show when ÄTA is selected */}
						{selectedAtaId && selectedAtaId !== 'none' && (
							<div className='mt-4'>
								<AtaHoursPicker
									id="ata-hours"
									label="ÄTA-tid (dras av från huvudprojektet)"
									value={ataMinutes}
									onChange={setAtaMinutes}
								/>
							</div>
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
						{isFetchingEntries ? (
							<Card className='border-2 border-border'>
								<CardContent className='flex flex-col items-center justify-center p-12 text-center'>
									<Loader2 className='w-12 h-12 text-muted-foreground mb-4 animate-spin' />
									<p className='text-muted-foreground'>Laddar tidrapporter...</p>
								</CardContent>
							</Card>
						) : entriesError ? (
							<Card className='border-2 border-destructive'>
								<CardContent className='flex flex-col items-center justify-center p-12 text-center'>
									<p className='text-destructive font-medium mb-2'>Fel vid hämtning av tidrapporter</p>
									<p className='text-sm text-muted-foreground'>{entriesError.message}</p>
									<Button onClick={() => refetch()} className='mt-4' variant='outline'>
										Försök igen
									</Button>
								</CardContent>
							</Card>
						) : recentEntries.length === 0 ? (
							<Card className='border-2 border-border'>
								<CardContent className='flex flex-col items-center justify-center p-12 text-center'>
									<Clock className='w-12 h-12 text-muted-foreground mb-4' />
									<p className='text-muted-foreground'>Inga tidrapporter hittades</p>
									<p className='text-sm text-muted-foreground mt-2'>
										{filterProject || filterStatus || filterUserId || filterStartDate || filterEndDate
											? 'Prova att rensa filtren'
											: 'Börja genom att fylla i formuläret ovan'}
									</p>
									{process.env.NODE_ENV !== 'production' && (
										<div className='text-xs text-muted-foreground mt-4 space-y-1'>
											<p>Debug: {timeEntries.length} entries from API</p>
											<p>Debug: {groupedEntries.length} after grouping</p>
											<p>Debug: URL = {buildEntriesUrl()}</p>
										</div>
									)}
								</CardContent>
							</Card>
						) : (
							<>
							{recentEntries.map((entry: any) => {
								const isGrouped = entry._grouped === true;
								const ataEntry = isGrouped ? entry._ataEntry : null;
								const mainDuration = isGrouped ? (entry._mainDuration ?? 0) : (entry.duration_min || 0);
								const ataDuration = isGrouped ? (entry._ataDuration ?? 0) : 0;
								const totalDuration = isGrouped ? (entry._totalDuration ?? 0) : (entry.duration_min || 0);
								
								const billingTypeLabel = entry.billing_type === 'FAST' ? 'Fast' : 'Löpande';
								const billingBadgeClasses =
									entry.billing_type === 'FAST'
										? 'bg-orange-500/20 text-orange-700 border-orange-300 dark:bg-[#3a251c] dark:text-[#f8ddba] dark:border-[#4a2f22]'
										: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700';

								return (
									<div
										key={isGrouped ? `grouped-${entry.id}-${ataEntry?.id}` : entry.id}
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

												{/* Show ÄTA info for grouped entries */}
												{(isGrouped && ataEntry) && (
													<div className='ml-11 mt-2 space-y-1'>
														<div className='flex items-center gap-2 flex-wrap'>
															<span className='text-xs font-medium text-muted-foreground'>
																ÄTA:
															</span>
															<span className='text-xs text-muted-foreground'>
																{ataEntry.ata?.title || 'Okänd ÄTA'}
															</span>
															<span className='text-xs text-orange-600 font-medium'>
																{ataDuration > 0 ? formatDuration(ataDuration) : '0min'}
															</span>
														</div>
														<div className='flex items-center gap-2 flex-wrap'>
															<span className='text-xs font-medium text-muted-foreground'>
																Ordinarie tid:
															</span>
															<span className='text-xs text-muted-foreground'>
																{formatDuration(mainDuration)}
															</span>
														</div>
													</div>
												)}
												{/* Show ÄTA info for single ÄTA entries (not grouped) */}
												{!isGrouped && entry.ata && (
													<div className='ml-11 mt-2 flex items-center gap-2 flex-wrap'>
														<span className='text-xs font-medium text-muted-foreground'>
															ÄTA:
														</span>
														<span className='text-xs text-muted-foreground'>
															{entry.ata.title}
														</span>
														{entry.duration_min && entry.duration_min > 0 && (
															<span className='text-xs text-orange-600 font-medium'>
																{formatDuration(entry.duration_min)}
															</span>
														)}
													</div>
												)}
												{entry.diary_entry?.work_performed && (
													<div className='ml-11 mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3'>
														<p className='text-xs font-semibold uppercase tracking-wide text-primary/80'>
															Dagboksnotering
														</p>
														<p className='mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'>
															{entry.diary_entry.work_performed}
														</p>
													</div>
												)}
											</div>

											{/* Right side - Duration and Status */}
											<div className='flex items-center gap-3 ml-11 md:ml-0'>
												<div className='text-right'>
													<p className='text-xl font-semibold'>
														{formatDuration(totalDuration)}
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
																	// For grouped entries, edit the main entry but include ÄTA info
																	if (isGrouped && ataEntry) {
																		// Create a combined entry for editing
																		const combinedEntry = {
																			...entry,
																			ata_id: ataEntry.ata_id,
																			_ataEntry: ataEntry,
																			_grouped: true
																		};
																		setEditingEntry(combinedEntry);
																	} else {
																		setEditingEntry(entry);
																	}
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
																onClick={() => handleDelete(entry)}
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
							})}
							{canLoadMoreEntries && (
								<div className='flex justify-center pt-2'>
									<Button
										variant='outline'
										onClick={() => setEntriesLimit((prev) => prev + 200)}
										disabled={isFetchingEntries}
										className='flex items-center gap-2'
									>
										{isFetchingEntries ? (
											<>
												<Loader2 className='h-4 w-4 animate-spin' />
												Laddar fler...
											</>
										) : (
											'Visa fler'
										)}
									</Button>
								</div>
							)}
							</>
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

