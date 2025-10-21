'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput } from '@/lib/schemas/time-entry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Loader2, CheckCircle2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { TimeEntryWithRelations } from '@/lib/schemas/time-entry';
import { useEffect } from 'react';

interface TimeEntryFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	initialData?: TimeEntryWithRelations;
}

export function TimeEntryForm({ orgId, onSuccess, onCancel, initialData }: TimeEntryFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedProject, setSelectedProject] = useState(initialData?.project_id || '');
	const [showSuccess, setShowSuccess] = useState(false);
	const isEditMode = !!initialData?.id;
	
	const supabase = createClient();
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<CreateTimeEntryInput>({
		resolver: zodResolver(createTimeEntrySchema),
		defaultValues: initialData ? {
			project_id: initialData.project_id,
			phase_id: initialData.phase_id,
			work_order_id: initialData.work_order_id,
			task_label: initialData.task_label,
			start_at: initialData.start_at.slice(0, 16), // Format for datetime-local
			stop_at: initialData.stop_at ? initialData.stop_at.slice(0, 16) : null,
			notes: initialData.notes,
		} : {
			start_at: new Date().toISOString().slice(0, 16),
		},
	});

	// Reset form when initialData changes
	useEffect(() => {
		if (initialData) {
			reset({
				project_id: initialData.project_id,
				phase_id: initialData.phase_id,
				work_order_id: initialData.work_order_id,
				task_label: initialData.task_label,
				start_at: initialData.start_at.slice(0, 16),
				stop_at: initialData.stop_at ? initialData.stop_at.slice(0, 16) : null,
				notes: initialData.notes,
			});
			setSelectedProject(initialData.project_id);
		}
	}, [initialData, reset]);

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch phases for selected project
	const { data: phases } = useQuery({
		queryKey: ['phases', selectedProject],
		queryFn: async () => {
			if (!selectedProject) return [];
			const { data, error } = await supabase
				.from('phases')
				.select('id, name')
				.eq('project_id', selectedProject)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProject,
	});

	// Fetch work orders for selected project
	const { data: workOrders } = useQuery({
		queryKey: ['work-orders', selectedProject],
		queryFn: async () => {
			if (!selectedProject) return [];
			const { data, error } = await supabase
				.from('work_orders')
				.select('id, name, status')
				.eq('project_id', selectedProject)
				.in('status', ['pending', 'in_progress'])
				.order('name');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProject,
	});

	const onSubmit = async (data: CreateTimeEntryInput) => {
		setIsSubmitting(true);
		setShowSuccess(false);

		try {
			const url = isEditMode ? `/api/time/entries/${initialData.id}` : '/api/time/entries';
			const method = isEditMode ? 'PATCH' : 'POST';
			
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
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
					notes: '',
				});
				setSelectedProject('');

				// Show success message
				setShowSuccess(true);
				setTimeout(() => setShowSuccess(false), 5000);
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
							<Select
								name="project_id"
								value={watch('project_id') || ''}
								onValueChange={(value) => {
									setValue('project_id', value);
									setSelectedProject(value);
								}}
							>
								<SelectTrigger id="project_id">
									<SelectValue placeholder="Välj projekt" />
								</SelectTrigger>
								<SelectContent>
									{projects?.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
											{project.project_number && ` (${project.project_number})`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{errors.project_id && (
							<p className="text-sm text-destructive">{errors.project_id.message}</p>
						)}
					</div>

					{/* Phase Selection (Optional) */}
					{selectedProject && phases && phases.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="phase_id">Fas (valfritt)</Label>
							<Select
								name="phase_id"
								value={watch('phase_id') || ''}
								onValueChange={(value) => setValue('phase_id', value || null)}
							>
								<SelectTrigger id="phase_id">
									<SelectValue placeholder="Välj fas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Ingen fas</SelectItem>
									{phases?.map((phase) => (
										<SelectItem key={phase.id} value={phase.id}>
											{phase.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Work Order Selection (Optional) */}
					{selectedProject && workOrders && workOrders.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="work_order_id">Arbetsorder (valfritt)</Label>
							<Select
								name="work_order_id"
								value={watch('work_order_id') || ''}
								onValueChange={(value) => setValue('work_order_id', value || null)}
							>
								<SelectTrigger id="work_order_id">
									<SelectValue placeholder="Välj arbetsorder" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Ingen arbetsorder</SelectItem>
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

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">Anteckningar (valfritt)</Label>
						<Textarea
							id="notes"
							placeholder="Fritext anteckningar..."
							rows={3}
							{...register('notes')}
						/>
					</div>

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
	);
}

