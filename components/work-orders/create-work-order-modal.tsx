'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkOrderSchema, type CreateWorkOrder } from '@/lib/schemas/work-order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';

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

interface User {
	id: string;
	full_name?: string;
	email?: string;
}

interface CreateWorkOrderModalProps {
	projects: Project[];
	customers: Customer[];
	users: User[];
	onClose: () => void;
	onSuccess: (workOrder: WorkOrderWithRelations) => void;
	initialProjectId?: string;
	initialCustomerId?: string;
	initialPlannedStart?: string;
	initialPlannedEnd?: string;
	initialUserId?: string;
}

export function CreateWorkOrderModal({
	projects,
	customers,
	users,
	onClose,
	onSuccess,
	initialProjectId,
	initialCustomerId,
	initialPlannedStart,
	initialPlannedEnd,
	initialUserId,
}: CreateWorkOrderModalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<CreateWorkOrder>({
		resolver: zodResolver(createWorkOrderSchema),
		defaultValues: {
			organization_id: '', // Will be set by API
			project_id: initialProjectId || '',
			customer_id: initialCustomerId || null,
			title: '',
			description: null,
			status: 'PLANERAD',
			priority: 'NORMAL',
			planned_start_at: initialPlannedStart || null,
			planned_end_at: initialPlannedEnd || null,
			actual_start_at: null,
			actual_end_at: null,
			all_day: false,
			work_order_type: 'PROJEKTBUNDEN',
			location_address: null,
			location_city: null,
			location_zip: null,
			location_lat: null,
			location_lng: null,
			door_code: null,
			location_notes: null,
			internal_notes: null,
			external_summary: null,
			created_by_id: null,
			closed_by_id: null,
			closed_at: null,
			signature_blob_url: null,
			billing_type_override: null,
			assignments: initialUserId
				? [{ user_id: initialUserId, is_responsible: true }]
				: [],
		},
	});

	const selectedProjectId = watch('project_id');

	// Auto-fill customer from project if not set
	const selectedProject = projects.find((p) => p.id === selectedProjectId);
	if (selectedProject && !watch('customer_id')) {
		// This would need project.customer_id - for now we'll let user select
	}

	const onSubmit = async (data: CreateWorkOrder) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch('/api/work-orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create work order');
			}

			const workOrder = await response.json();
			onSuccess(workOrder);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Skapa arbetsorder</DialogTitle>
					<DialogDescription>
						Skapa en ny arbetsorder för att planera och spåra arbete
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
					{error && (
						<div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded'>
							{error}
						</div>
					)}

					<div className='space-y-2'>
						<Label htmlFor='title'>
							Titel <span className='text-red-500'>*</span>
						</Label>
						<Input
							id='title'
							{...register('title')}
							placeholder='Ex: Byte blandare'
						/>
						{errors.title && (
							<p className='text-sm text-red-600'>{errors.title.message}</p>
						)}
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='project_id'>
								Projekt <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={watch('project_id')}
								onValueChange={(value) => setValue('project_id', value)}
							>
								<SelectTrigger>
									<SelectValue placeholder='Välj projekt' />
								</SelectTrigger>
								<SelectContent>
									{projects.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.project_id && (
								<p className='text-sm text-red-600'>
									{errors.project_id.message}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='customer_id'>Kund</Label>
							<Select
								value={watch('customer_id') || ''}
								onValueChange={(value) =>
									setValue('customer_id', value || null)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Välj kund' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value=''>Ingen kund</SelectItem>
									{customers.map((customer) => (
										<SelectItem key={customer.id} value={customer.id}>
											{customer.type === 'COMPANY'
												? customer.company_name
												: `${customer.first_name || ''} ${customer.last_name || ''}`.trim()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='description'>Beskrivning</Label>
						<Textarea
							id='description'
							{...register('description')}
							placeholder='Beskriv arbetsordern...'
							rows={3}
						/>
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='status'>Status</Label>
							<Select
								value={watch('status')}
								onValueChange={(value) =>
									setValue('status', value as any)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='PLANERAD'>Planerad</SelectItem>
									<SelectItem value='PÅGÅENDE'>Pågående</SelectItem>
									<SelectItem value='KLAR'>Klar</SelectItem>
									<SelectItem value='AVBOKAD'>Avbokad</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='priority'>Prioritet</Label>
							<Select
								value={watch('priority')}
								onValueChange={(value) =>
									setValue('priority', value as any)
								}
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
						<Label htmlFor='location_address'>Adress</Label>
						<Input
							id='location_address'
							{...register('location_address')}
							placeholder='Gatuadress'
						/>
					</div>

					<div className='grid gap-4 md:grid-cols-3'>
						<div className='space-y-2'>
							<Label htmlFor='location_city'>Stad</Label>
							<Input
								id='location_city'
								{...register('location_city')}
								placeholder='Stad'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='location_zip'>Postnummer</Label>
							<Input
								id='location_zip'
								{...register('location_zip')}
								placeholder='123 45'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='door_code'>Portkod</Label>
							<Input
								id='door_code'
								{...register('door_code')}
								placeholder='1234'
							/>
						</div>
					</div>

					<div className='flex gap-2 justify-end'>
						<Button type='button' variant='outline' onClick={onClose}>
							Avbryt
						</Button>
						<Button type='submit' disabled={isSubmitting}>
							{isSubmitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
							Skapa arbetsorder
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

