'use client';

import { useMemo, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@/lib/schemas/time-entry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Loader2, CheckCircle2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TimeEntryWithRelations } from '@/lib/schemas/time-entry';
import { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';

const NO_ATA_SELECT_VALUE = '__no_ata__';
const NO_PHASE_SELECT_VALUE = '__no_phase__';
const NO_WORK_ORDER_SELECT_VALUE = '__no_work_order__';

type ProjectOption = {
	id: string;
	name: string;
	project_number: string | null;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_time_billing_type: BillingType;
};

type FixedBlockOption = {
	id: string;
	name: string;
	amount_sek: number;
	status: 'open' | 'closed';
};

type AtaOption = {
	id: string;
	title: string;
	ata_number: string | null;
	billing_type: BillingType;
};

type TimeEntryFormValues = Omit<CreateTimeEntryInput, 'billing_type' | 'fixed_block_id'> & {
	billing_type: '' | BillingType;
	fixed_block_id: string | null;
};

interface TimeEntryFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	initialData?: TimeEntryWithRelations;
}

export function TimeEntryForm({ orgId, onSuccess, onCancel, initialData }: TimeEntryFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [showDiaryPromptDialog, setShowDiaryPromptDialog] = useState(false);
	const [completedProjectId, setCompletedProjectId] = useState<string | null>(null);
	const [billingInteractionRequired, setBillingInteractionRequired] = useState(false);
	const isEditMode = !!initialData?.id;
	
	const supabase = createClient();
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		control,
		reset,
	} = useForm<TimeEntryFormValues>({
		resolver: zodResolver(createTimeEntrySchema) as Resolver<TimeEntryFormValues>,
		defaultValues: initialData
			? {
					project_id: initialData.project_id ? String(initialData.project_id) : '',
					phase_id: initialData.phase_id,
					work_order_id: initialData.work_order_id,
					task_label: initialData.task_label,
					start_at: initialData.start_at.slice(0, 16), // Format for datetime-local
					stop_at: initialData.stop_at ? initialData.stop_at.slice(0, 16) : null,
					notes: initialData.notes,
					billing_type: initialData.billing_type ?? 'LOPANDE',
					fixed_block_id: initialData.fixed_block_id ?? null,
					ata_id: initialData.ata_id ?? null,
			  }
			: {
					project_id: '',
					start_at: new Date().toISOString().slice(0, 16),
					billing_type: '',
					fixed_block_id: null,
					ata_id: null,
			  },
	});

	// Reset form when initialData changes
	useEffect(() => {
		if (initialData) {
			reset({
				project_id: initialData.project_id ? String(initialData.project_id) : '',
				phase_id: initialData.phase_id,
				work_order_id: initialData.work_order_id,
				task_label: initialData.task_label,
				start_at: initialData.start_at.slice(0, 16),
				stop_at: initialData.stop_at ? initialData.stop_at.slice(0, 16) : null,
				notes: initialData.notes,
				billing_type: initialData.billing_type ?? 'LOPANDE',
				fixed_block_id: initialData.fixed_block_id ?? null,
				ata_id: initialData.ata_id ?? null,
			});
		}
	}, [initialData, reset]);

	const watchedProjectId = watch('project_id');
	const selectedProjectId = watchedProjectId ? String(watchedProjectId) : undefined;

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery<ProjectOption[]>({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number, billing_mode, default_time_billing_type')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch phases for selected project
	const { data: phases } = useQuery({
		queryKey: ['phases', selectedProjectId],
		queryFn: async () => {
			if (!selectedProjectId) return [];
			const { data, error } = await supabase
				.from('phases')
				.select('id, name')
				.eq('project_id', selectedProjectId)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProjectId,
	});

	// Fetch work orders for selected project
	const { data: workOrders } = useQuery({
		queryKey: ['work-orders', selectedProjectId],
		queryFn: async () => {
			if (!selectedProjectId) return [];
			const { data, error } = await supabase
				.from('work_orders')
				.select('id, name, status')
				.eq('project_id', selectedProjectId)
				.in('status', ['pending', 'in_progress'])
				.order('name');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProjectId,
	});

	const selectedProjectDetails = useMemo(() => {
		if (!selectedProjectId) return null;
		return projects?.find((p) => String(p.id) === String(selectedProjectId)) ?? null;
	}, [projects, selectedProjectId]);

	const effectiveBillingMode =
		selectedProjectDetails?.billing_mode ??
		(selectedProjectId ? 'LOPANDE_ONLY' : undefined);
	const {
		data: fixedBlocks = [],
		isLoading: fixedBlocksLoading,
		error: fixedBlocksError,
	} = useQuery<FixedBlockOption[]>({
		queryKey: ['fixed-time-blocks', selectedProjectId],
		queryFn: async () => {
			if (
				!selectedProjectId ||
				(effectiveBillingMode !== 'FAST_ONLY' && effectiveBillingMode !== 'BOTH')
			) {
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

	const {
		data: atas = [],
		isLoading: atasLoading,
		error: atasError,
	} = useQuery<AtaOption[]>({
		queryKey: ['atas', selectedProjectId],
		queryFn: async () => {
			if (!selectedProjectId) return [];
			const { data, error } = await supabase
				.from('ata')
				.select('id, title, ata_number, billing_type, status, org_id')
				.eq('project_id', selectedProjectId)
				.eq('org_id', orgId)
				.not('status', 'eq', 'rejected')
				.order('created_at', { ascending: false });

			if (error) throw error;
			return (
				data || []
			).map((ata) => ({
				id: ata.id,
				title: ata.title,
				ata_number: ata.ata_number,
				billing_type: ata.billing_type as BillingType,
			}));
		},
		enabled: !!selectedProjectId,
	});

	const atasErrorMessage = atasError instanceof Error ? atasError.message : undefined;

	const billingType = watch('billing_type') as TimeEntryFormValues['billing_type'];
const fixedBlockId = watch('fixed_block_id') as string | null | undefined;
const ataId = watch('ata_id') as string | null | undefined;
const hasFixedBlocks = fixedBlocks.length > 0;

useEffect(() => {
	if (process.env.NODE_ENV !== 'production') {
		console.log('TimeEntryForm watch', {
			projectId: selectedProjectId ?? null,
			billingType,
			fixedBlockId,
			ataId,
			projectsCount: projects?.length ?? 0,
			hasProjectDetails: Boolean(selectedProjectDetails),
			effectiveBillingMode,
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
		if (ataId) {
			setValue('ata_id', null, { shouldDirty: false });
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
	const hasSelection = billingType === 'LOPANDE' || billingType === 'FAST';
	setBillingInteractionRequired(!hasSelection);
	if (!hasSelection && fixedBlockId) {
		setValue('fixed_block_id', null, { shouldDirty: true });
		return;
	}

	if (billingType !== 'FAST' && fixedBlockId) {
		setValue('fixed_block_id', null, { shouldDirty: true });
	}

	if (billingType !== 'FAST' && ataId) {
		const selectedAta = atas.find((ata) => ata.id === ataId);
		if (!selectedAta || selectedAta.billing_type === 'FAST') {
			setValue('ata_id', null, { shouldDirty: true });
		}
	}
}, [selectedProjectId, selectedProjectDetails, billingType, fixedBlockId, ataId, atas, setValue]);

useEffect(() => {
	if (!selectedProjectId || !ataId) return;
	const selectedAta = atas.find((ata) => ata.id === ataId);
	if (!selectedAta) {
		setValue('ata_id', null, { shouldDirty: true });
		return;
	}

	if (selectedAta.billing_type === 'FAST' && billingType !== 'FAST') {
		setValue('billing_type', 'FAST', { shouldDirty: true });
	}
	if (selectedAta.billing_type === 'LOPANDE' && billingType !== 'LOPANDE') {
		setValue('billing_type', 'LOPANDE', { shouldDirty: true });
	}
}, [selectedProjectId, ataId, atas, billingType, setValue]);

	const fixedBlocksErrorMessage =
		fixedBlocksError instanceof Error ? fixedBlocksError.message : undefined;

	const onSubmit = async (data: TimeEntryFormValues) => {
		const payload: CreateTimeEntryInput = {
			...data,
			billing_type: (data.billing_type === '' ? 'LOPANDE' : data.billing_type) as BillingType,
			fixed_block_id: data.fixed_block_id ?? null,
			ata_id: data.ata_id ?? null,
		};

		setIsSubmitting(true);
		setShowSuccess(false);

		try {
			const url = isEditMode ? `/api/time/entries/${initialData.id}` : '/api/time/entries';
			const method = isEditMode ? 'PATCH' : 'POST';
			
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} time entry`);
			}

			// Invalidate time entries cache to refresh the list
			queryClient.invalidateQueries({ queryKey: ['time-entries', orgId] });

			if (!isEditMode) {
				// Reset form to initial state (only for create mode)
				reset({
					project_id: '',
					phase_id: null,
					work_order_id: null,
					task_label: '',
					start_at: new Date().toISOString().slice(0, 16),
					stop_at: null,
					billing_type: 'LOPANDE',
					fixed_block_id: null,
					ata_id: null,
				});

				// Show success message
				setShowSuccess(true);
				setTimeout(() => setShowSuccess(false), 5000);

				// Prompt to create diary entry like the slider
				if (data.project_id) {
					setCompletedProjectId(data.project_id);
					setShowDiaryPromptDialog(true);
				}
			}

			onSuccess?.();
		} catch (error) {
			console.error(`Error ${isEditMode ? 'updating' : 'creating'} time entry:`, error);
			alert(error instanceof Error ? error.message : `Misslyckades att ${isEditMode ? 'uppdatera' : 'skapa'} tidrapport`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			{/* Diary Prompt Dialog - reused same UI as slider */}
			<Dialog open={showDiaryPromptDialog} onOpenChange={setShowDiaryPromptDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bra jobbat! 👏</DialogTitle>
						<DialogDescription>
							Din arbetstid har sparats.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 mt-4">
						<p className="text-sm text-muted-foreground">
							Vill du uppdatera dagboken för detta projekt nu?
						</p>
						<div className="flex gap-3">
							<Button
								variant="outline"
								onClick={() => setShowDiaryPromptDialog(false)}
								className="flex-1"
							>
								Inte nu
							</Button>
							{completedProjectId && (
								<Link 
									href={`/dashboard/diary/new?project_id=${completedProjectId}`}
									className="flex-1"
									onClick={() => setShowDiaryPromptDialog(false)}
								>
									<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
										Skapa dagbokspost
									</Button>
								</Link>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Clock className="w-6 h-6 text-primary" />
						<div>
							<CardTitle>{isEditMode ? 'Redigera tidrapport' : 'Lägg till tid'}</CardTitle>
							<CardDescription>
								{isEditMode ? 'Uppdatera tidrapport information' : 'Registrera arbetstid manuellt'}
							</CardDescription>
						</div>
					</div>
					{isEditMode && onCancel && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={onCancel}
						>
							<X className="w-4 h-4" />
						</Button>
					)}
				</div>
		</CardHeader>
		<CardContent>
			{/* Success Message */}
			{showSuccess && (
				<div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
					<CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
					<div>
						<p className="text-sm font-medium text-green-900">Tidrapport sparad!</p>
						<p className="text-sm text-green-700">Din arbetstid har registrerats.</p>
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{/* Project Selection */}
				<div className="space-y-2">
					<Label htmlFor="project_id">Projekt *</Label>
					{projectsLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="w-4 h-4 animate-spin" />
							Laddar projekt...
						</div>
					) : (
						<Controller
							name="project_id"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : undefined}
									onValueChange={(value) => {
										const normalized = String(value);
										field.onChange(normalized);
										const projectMode = projects?.find((p) => String(p.id) === normalized)?.billing_mode;
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
									<SelectTrigger id="project_id">
										<SelectValue placeholder="Välj projekt" />
									</SelectTrigger>
									<SelectContent>
										{projects?.map((project) => (
											<SelectItem key={String(project.id)} value={String(project.id)}>
												{project.name}
												{project.project_number && ` (${project.project_number})`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
					)}
					{errors.project_id && (
						<p className="text-sm text-destructive">{errors.project_id.message}</p>
					)}
				</div>

				{/* Billing Type */}
				{selectedProjectId && (
					<div className="space-y-2">
						<Label>Debitering</Label>
						{effectiveBillingMode === 'BOTH' ? (
							<Controller
								name="billing_type"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={(value) => {
											const normalized = value as BillingType;
											field.onChange(normalized);
											if (normalized !== 'FAST') {
												setValue('fixed_block_id', null, { shouldDirty: true });
											}
										}}
									>
										<SelectTrigger>
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
								)}
							/>
						) : (
							<div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
								Debitering:{' '}
								{effectiveBillingMode === 'FAST_ONLY' ? 'Fast' : 'Löpande'}
							</div>
						)}
						{billingInteractionRequired && !billingType && (
							<p className="text-sm text-destructive">Välj debitering innan du sparar.</p>
						)}
					</div>
				)}

				{/* Fixed block selection */}
				{selectedProjectId &&
					(billingType === 'FAST' || effectiveBillingMode === 'FAST_ONLY') && (
						<div className="space-y-2">
							<Label htmlFor="fixed_block_id">
								Fast post {hasFixedBlocks && <span className="text-destructive">*</span>}
							</Label>
							{fixedBlocksLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									Hämtar fasta poster...
								</div>
							) : hasFixedBlocks ? (
								<Controller
									name="fixed_block_id"
									control={control}
									render={({ field }) => (
										<Select
											value={field.value || undefined}
											onValueChange={(value) => {
												const normalized = value ? String(value) : null;
												field.onChange(normalized);
											}}
										>
											<SelectTrigger id="fixed_block_id">
												<SelectValue placeholder="Välj fast post" />
											</SelectTrigger>
											<SelectContent>
												{fixedBlocks.map((block) => (
													<SelectItem key={String(block.id)} value={String(block.id)}>
														{block.name} ({Math.round(Number(block.amount_sek || 0))} SEK)
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							) : (
								<div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
									Inga fasta poster i projektet – debiteringen kopplas till huvudprojektets fasta budget.
								</div>
							)}
							{fixedBlocksErrorMessage && (
								<p className="text-sm text-destructive">{fixedBlocksErrorMessage}</p>
							)}
							{errors.fixed_block_id && (
								<p className="text-sm text-destructive">{errors.fixed_block_id.message}</p>
							)}
							{hasFixedBlocks && (
								<p className="text-xs text-muted-foreground">
									Fast tid måste kopplas till en fast post eller ÄTA.
								</p>
							)}
						</div>
					)}

					{/* ATA Selection (Optional) */}
					{selectedProjectId && (
						<div>
							<Label htmlFor="ata_id">ÄTA (valfritt)</Label>
							{atasLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
									<Loader2 className="w-4 h-4 animate-spin" /> Hämtar ÄTA...
								</div>
							) : atas.length > 0 ? (
								<Select
									value={ataId ?? NO_ATA_SELECT_VALUE}
									onValueChange={(value) => {
										const normalized = value === NO_ATA_SELECT_VALUE ? null : value;
										setValue('ata_id', normalized, { shouldDirty: true, shouldValidate: true });
									}}
								>
									<SelectTrigger id="ata_id">
										<SelectValue placeholder="Välj ÄTA" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_ATA_SELECT_VALUE}>Ingen ÄTA</SelectItem>
										{atas.map((ata) => (
											<SelectItem key={ata.id} value={ata.id}>
												{ata.ata_number ? `${ata.ata_number} – ` : ''}{ata.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<p className="text-sm text-muted-foreground mt-1">Inga ÄTA i detta projekt ännu.</p>
							)}
							{atasErrorMessage && (
								<p className="text-sm text-destructive mt-1">{atasErrorMessage}</p>
							)}
						</div>
					)}

					{/* Phase Selection (Optional) */}
					{selectedProjectId && phases && phases.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="phase_id">Fas (valfritt)</Label>
							<Select
								name="phase_id"
								value={watch('phase_id') ?? NO_PHASE_SELECT_VALUE}
								onValueChange={(value) =>
									setValue('phase_id', value === NO_PHASE_SELECT_VALUE ? null : value)
								}
							>
								<SelectTrigger id="phase_id">
									<SelectValue placeholder="Välj fas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_PHASE_SELECT_VALUE}>Ingen fas</SelectItem>
									{phases?.map((phase) => (
										<SelectItem key={phase.id} value={phase.id}>
											{phase.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{process.env.NODE_ENV !== 'production' && (
						<pre className="mt-6 max-h-48 overflow-auto rounded border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
							{JSON.stringify(
								{
									rhf: {
										project_id: selectedProjectId ?? null,
										billing_type: billingType,
										fixed_block_id: fixedBlockId ?? null,
									},
									effectiveBillingMode,
									fixedBlocksCount: fixedBlocks.length,
								},
								null,
								2,
							)}
						</pre>
					)}

					{/* Work Order Selection (Optional) */}
					{selectedProjectId && workOrders && workOrders.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="work_order_id">Arbetsorder (valfritt)</Label>
							<Select
								name="work_order_id"
								value={watch('work_order_id') ?? NO_WORK_ORDER_SELECT_VALUE}
								onValueChange={(value) =>
									setValue('work_order_id', value === NO_WORK_ORDER_SELECT_VALUE ? null : value)
								}
							>
								<SelectTrigger id="work_order_id">
									<SelectValue placeholder="Välj arbetsorder" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_WORK_ORDER_SELECT_VALUE}>Ingen arbetsorder</SelectItem>
									{workOrders?.map((wo) => (
										<SelectItem key={wo.id} value={wo.id}>
											{wo.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Task Label */}
					<div className="space-y-2">
						<Label htmlFor="task_label">Uppgift (valfritt)</Label>
						<Input
							id="task_label"
							placeholder="t.ex. Målning, Montering, etc."
							{...register('task_label')}
						/>
					</div>

					{/* Time Range */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="start_at">Starttid *</Label>
							<Input
								id="start_at"
								type="datetime-local"
								{...register('start_at')}
							/>
							{errors.start_at && (
								<p className="text-sm text-destructive">{errors.start_at.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="stop_at">Sluttid (valfritt)</Label>
							<Input
								id="stop_at"
								type="datetime-local"
								{...register('stop_at')}
							/>
							{errors.stop_at && (
								<p className="text-sm text-destructive">{errors.stop_at.message}</p>
							)}
						</div>
					</div>

					{/* Description field removed: we now prompt for diary update after save */}

					{/* Actions */}
				<div className="flex gap-3 pt-4">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
						{isEditMode ? 'Uppdatera tid' : 'Spara tid'}
					</Button>
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel}>
								Avbryt
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	</>
	);
}

