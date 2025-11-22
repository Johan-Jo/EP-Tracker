'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateWorkOrderSchema, type UpdateWorkOrder } from '@/lib/schemas/work-order';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface Project {
	id: string;
	name: string;
	project_number?: string;
}

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name?: string;
	first_name?: string;
	last_name?: string;
}

interface WorkOrderGeneralTabProps {
	workOrder: WorkOrderWithRelations;
	projects: Project[];
	customers: Customer[];
	canEdit: boolean;
	onUpdate: () => void;
}

export function WorkOrderGeneralTab({
	workOrder,
	projects,
	customers,
	canEdit,
	onUpdate,
}: WorkOrderGeneralTabProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<UpdateWorkOrder>({
		resolver: zodResolver(updateWorkOrderSchema),
		defaultValues: {
			title: workOrder.title,
			description: workOrder.description || null,
			status: workOrder.status,
			priority: workOrder.priority,
			planned_start_at: workOrder.planned_start_at
				? format(new Date(workOrder.planned_start_at), "yyyy-MM-dd'T'HH:mm")
				: null,
			planned_end_at: workOrder.planned_end_at
				? format(new Date(workOrder.planned_end_at), "yyyy-MM-dd'T'HH:mm")
				: null,
			actual_start_at: workOrder.actual_start_at
				? format(new Date(workOrder.actual_start_at), "yyyy-MM-dd'T'HH:mm")
				: null,
			actual_end_at: workOrder.actual_end_at
				? format(new Date(workOrder.actual_end_at), "yyyy-MM-dd'T'HH:mm")
				: null,
			all_day: workOrder.all_day,
			internal_notes: workOrder.internal_notes || null,
		},
	});

	const onSubmit = async (data: UpdateWorkOrder) => {
		setIsSubmitting(true);

		try {
			// Convert datetime-local format to ISO string
			const updateData: any = { ...data };
			if (updateData.planned_start_at) {
				updateData.planned_start_at = new Date(updateData.planned_start_at).toISOString();
			}
			if (updateData.planned_end_at) {
				updateData.planned_end_at = new Date(updateData.planned_end_at).toISOString();
			}
			if (updateData.actual_start_at) {
				updateData.actual_start_at = new Date(updateData.actual_start_at).toISOString();
			}
			if (updateData.actual_end_at) {
				updateData.actual_end_at = new Date(updateData.actual_end_at).toISOString();
			}

			const response = await fetch(`/api/work-orders/${workOrder.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update work order');
			}

			toast.success('Arbetsorder uppdaterad');
			setIsEditing(false);
			onUpdate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Ett fel uppstod');
		} finally {
			setIsSubmitting(false);
		}
	};

	const formatDateTime = (dateString: string | null | undefined) => {
		if (!dateString) return '-';
		try {
			return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: sv });
		} catch {
			return '-';
		}
	};

	if (!isEditing) {
		return (
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle>Allmänt</CardTitle>
						{canEdit && (
							<Button variant='outline' onClick={() => setIsEditing(true)}>
								Redigera
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div>
						<Label>Titel</Label>
						<p className='text-sm font-medium'>{workOrder.title}</p>
					</div>
					<div>
						<Label>Projekt</Label>
						<p className='text-sm'>{workOrder.project?.name || '-'}</p>
					</div>
					<div>
						<Label>Kund</Label>
						<p className='text-sm'>
							{workOrder.customer
								? workOrder.customer.type === 'COMPANY'
									? workOrder.customer.company_name
									: `${workOrder.customer.first_name || ''} ${workOrder.customer.last_name || ''}`.trim()
								: '-'}
						</p>
					</div>
					{workOrder.description && (
						<div>
							<Label>Beskrivning</Label>
							<p className='text-sm whitespace-pre-wrap'>{workOrder.description}</p>
						</div>
					)}
					<div className='grid gap-4 md:grid-cols-2'>
						<div>
							<Label>Status</Label>
							<p className='text-sm'>{workOrder.status}</p>
						</div>
						<div>
							<Label>Prioritet</Label>
							<p className='text-sm'>{workOrder.priority}</p>
						</div>
					</div>
					<div className='grid gap-4 md:grid-cols-2'>
						<div>
							<Label>Planerad start</Label>
							<p className='text-sm'>{formatDateTime(workOrder.planned_start_at)}</p>
						</div>
						<div>
							<Label>Planerad slut</Label>
							<p className='text-sm'>{formatDateTime(workOrder.planned_end_at)}</p>
						</div>
					</div>
					{workOrder.actual_start_at && (
						<div className='grid gap-4 md:grid-cols-2'>
							<div>
								<Label>Faktisk start</Label>
								<p className='text-sm'>{formatDateTime(workOrder.actual_start_at)}</p>
							</div>
							{workOrder.actual_end_at && (
								<div>
									<Label>Faktisk slut</Label>
									<p className='text-sm'>{formatDateTime(workOrder.actual_end_at)}</p>
								</div>
							)}
						</div>
					)}
					{workOrder.internal_notes && (
						<div>
							<Label>Interna anteckningar</Label>
							<p className='text-sm whitespace-pre-wrap'>{workOrder.internal_notes}</p>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Redigera - Allmänt</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='title'>
							Titel <span className='text-red-500'>*</span>
						</Label>
						<Input id='title' {...register('title')} />
						{errors.title && (
							<p className='text-sm text-red-600'>{errors.title.message}</p>
						)}
					</div>

					<div className='space-y-2'>
						<Label htmlFor='description'>Beskrivning</Label>
						<Textarea
							id='description'
							{...register('description')}
							rows={4}
						/>
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='status'>Status</Label>
							<Select
								value={watch('status')}
								onValueChange={(value) => setValue('status', value as any)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='PLANERAD'>Planerad</SelectItem>
									<SelectItem value='PÅGÅENDE'>Pågående</SelectItem>
									<SelectItem value='KLAR'>Klar</SelectItem>
									<SelectItem value='FAKTURERAD'>Fakturerad</SelectItem>
									<SelectItem value='AVBOKAD'>Avbokad</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='priority'>Prioritet</Label>
							<Select
								value={watch('priority')}
								onValueChange={(value) => setValue('priority', value as any)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='LOW'>Låg</SelectItem>
									<SelectItem value='NORMAL'>Normal</SelectItem>
									<SelectItem value='HIGH'>Hög</SelectItem>
									<SelectItem value='AKUT'>Akut</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='planned_start_at'>Planerad start</Label>
							<Input
								id='planned_start_at'
								type='datetime-local'
								{...register('planned_start_at')}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='planned_end_at'>Planerad slut</Label>
							<Input
								id='planned_end_at'
								type='datetime-local'
								{...register('planned_end_at')}
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='internal_notes'>Interna anteckningar</Label>
						<Textarea
							id='internal_notes'
							{...register('internal_notes')}
							rows={3}
						/>
					</div>

					<div className='flex gap-2 justify-end'>
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								setIsEditing(false);
								reset();
							}}
						>
							Avbryt
						</Button>
						<Button type='submit' disabled={isSubmitting}>
							{isSubmitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
							Spara
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

