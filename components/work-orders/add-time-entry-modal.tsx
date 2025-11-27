'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@/lib/schemas/time-entry';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';
import { toast } from 'sonner';

interface AddTimeEntryModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: string;
	projectId: string;
	workOrderId: string;
	onSuccess?: () => void;
}

type TimeEntryFormValues = Omit<CreateTimeEntryInput, 'billing_type' | 'fixed_block_id'> & {
	billing_type: '' | BillingType;
	fixed_block_id: string | null;
	work_order_id?: string | null;
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

// Helper function to always get today's date
function getTodayDate() {
	const today = new Date();
	return today.toISOString().split('T')[0];
}

interface ProjectOption {
	id: string;
	name: string;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_time_billing_type: BillingType;
}

export function AddTimeEntryModal({
	open,
	onOpenChange,
	orgId,
	projectId,
	workOrderId,
	onSuccess,
}: AddTimeEntryModalProps) {
	const supabase = createClient();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [currentDate, setCurrentDate] = useState(() => getTodayDate());
	const [startTime, setStartTime] = useState('');
	const [endTime, setEndTime] = useState('');
	const isSubmittingRef = useRef(false);

	// Fetch organization break settings
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
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});

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
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});

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
			project_id: projectId || '',
			work_order_id: workOrderId || null,
			phase_id: null,
			task_label: '',
			billing_type: '',
			fixed_block_id: null,
			ata_id: null,
			start_at: '',
			stop_at: null,
		},
	});

	const watchedProjectId = watch('project_id');
	const selectedProjectId = watchedProjectId ? String(watchedProjectId) : '';
	const billingType = watch('billing_type') as TimeEntryFormValues['billing_type'];

	const selectedProjectDetails = useMemo(() => {
		if (!selectedProjectId) return undefined;
		return projects?.find((project) => String(project.id) === String(selectedProjectId));
	}, [projects, selectedProjectId]);

	const effectiveBillingMode =
		selectedProjectDetails?.billing_mode ?? (selectedProjectId ? 'LOPANDE_ONLY' : undefined);

	// Set default start and end times from organization settings when loaded
	useEffect(() => {
		if (orgBreakSettings && open) {
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			if (!startTime) {
				setStartTime(defaults.start);
			}
			if (!endTime) {
				setEndTime(defaults.end);
			}
		}
	}, [orgBreakSettings, open, startTime, endTime]);

	// Initialize start_at and stop_at when date/time changes
	useEffect(() => {
		if (startTime && currentDate) {
			setValue('start_at', `${currentDate}T${startTime}`);
		}
	}, [currentDate, startTime, setValue]);

	useEffect(() => {
		if (endTime && currentDate) {
			setValue('stop_at', `${currentDate}T${endTime}`);
		}
	}, [currentDate, endTime, setValue]);

	// Set project when modal opens
	useEffect(() => {
		if (open && projectId) {
			setValue('project_id', projectId, { shouldDirty: true });
			setValue('work_order_id', workOrderId, { shouldDirty: true });
			// Set billing type based on project
			const project = projects?.find((p) => String(p.id) === String(projectId));
			if (project) {
				if (project.billing_mode === 'FAST_ONLY') {
					setValue('billing_type', 'FAST', { shouldDirty: true });
				} else if (project.billing_mode === 'LOPANDE_ONLY') {
					setValue('billing_type', 'LOPANDE', { shouldDirty: true });
				}
			}
		}
	}, [open, projectId, workOrderId, projects, setValue]);

	// Reset form when modal closes
	useEffect(() => {
		if (!open) {
			const today = getTodayDate();
			const defaults = getDefaultWorkTimes(orgBreakSettings);
			setCurrentDate(today);
			setStartTime(defaults.start);
			setEndTime(defaults.end);
			reset({
				project_id: projectId || '',
				work_order_id: workOrderId || null,
				phase_id: null,
				task_label: '',
				billing_type: '',
				fixed_block_id: null,
				ata_id: null,
				start_at: `${today}T${defaults.start}`,
				stop_at: `${today}T${defaults.end}`,
			});
		}
	}, [open, projectId, workOrderId, orgBreakSettings, reset]);

	const onSubmit = async (data: TimeEntryFormValues) => {
		// Prevent double submission
		if (isSubmittingRef.current || isSubmitting) {
			return;
		}

		isSubmittingRef.current = true;
		setIsSubmitting(true);

		const normalizedBillingType =
			data.billing_type === '' ? selectedProjectDetails?.default_time_billing_type ?? 'LOPANDE' : data.billing_type;

		const payload: CreateTimeEntryInput = {
			...data,
			project_id: String(data.project_id),
			billing_type: normalizedBillingType as BillingType,
			fixed_block_id: data.fixed_block_id ?? null,
			ata_id: null, // ÄTA should not be used with work orders
			work_order_id: data.work_order_id ?? null,
		};

		try {
			const response = await fetch('/api/time/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa tidrapport');
			}

			toast.success('Tidrapport sparad');
			queryClient.invalidateQueries({ queryKey: ['work-order-time-entries', workOrderId] });
			queryClient.invalidateQueries({ queryKey: ['time-entries-stats'] });

			onSuccess?.();
			onOpenChange(false);
		} catch (error) {
			console.error('Error creating time entry:', error);
			toast.error(error instanceof Error ? error.message : 'Misslyckades att skapa tidrapport');
		} finally {
			isSubmittingRef.current = false;
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Lägg till tid</DialogTitle>
					<DialogDescription>
						Registrera arbetstid för denna arbetsorder
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{/* Project */}
					<div>
						<label className="block text-sm font-medium mb-2">
							Projekt <span className="text-destructive">*</span>
						</label>
						{projectsLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
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
								}}
							>
								<SelectTrigger className="h-11 justify-between text-left">
									<SelectValue placeholder="Välj projekt" />
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
							<p className="text-sm text-destructive mt-1">{errors.project_id.message}</p>
						)}
					</div>

					{/* Billing Type */}
					{selectedProjectId && (
						<div>
							<label className="block text-sm font-medium mb-2">
								Debitering {effectiveBillingMode === 'BOTH' && <span className="text-destructive">*</span>}
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
										<SelectValue placeholder="Välj debitering" />
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
								<div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
									Debitering: Fast
								</div>
							) : (
								<div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
									Debitering: Löpande
								</div>
							)}
						</div>
					)}

					{/* Task Label */}
					<div>
						<label className="block text-sm font-medium mb-2">Uppgift (valfritt)</label>
						<Input
							placeholder="t.ex. Målning, Montering, etc."
							{...register('task_label')}
						/>
					</div>

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
					<div className="grid grid-cols-2 gap-4">
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

					{/* Notes */}
					<div>
						<label className="block text-sm font-medium mb-2">Anteckningar (valfritt)</label>
						<Input
							placeholder="Lägg till anteckningar..."
							{...register('notes')}
						/>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-2 justify-end pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Avbryt
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Sparar...
								</>
							) : (
								<>
									<Save className="w-4 h-4 mr-2" />
									Spara tidsrapport
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

