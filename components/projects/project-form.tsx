'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormData } from '@/lib/schemas/project';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProjectFormProps {
	project?: ProjectFormData & { id?: string };
	orgId: string;
	onSubmit: (data: ProjectFormData) => Promise<void>;
}

export function ProjectForm({ project, orgId, onSubmit }: ProjectFormProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm({
		resolver: zodResolver(projectSchema),
		defaultValues: project || {
			name: '',
			project_number: null,
			client_name: null,
			site_address: null,
			site_lat: null,
			site_lon: null,
			geo_fence_radius_m: 100,
			budget_mode: 'none' as const,
			status: 'active' as const,
		},
	});

	const budgetMode = watch('budget_mode');
	const status = watch('status');

	const handleFormSubmit = async (data: any) => {
		setIsSubmitting(true);
		setError(null);

		try {
			await onSubmit(data as ProjectFormData);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className='space-y-6'>
			{error && (
				<Card className='border-destructive'>
					<CardContent className='pt-6'>
						<p className='text-sm text-destructive'>{error}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Grunduppgifter</CardTitle>
					<CardDescription>
						Fyll i projektets grundläggande information
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='name'>
							Projektnamn <span className='text-destructive'>*</span>
						</Label>
						<Input
							id='name'
							{...register('name')}
							placeholder='Ex: Nybyggnad Kungsbacka'
						/>
						{errors.name && (
							<p className='text-sm text-destructive'>{errors.name.message}</p>
						)}
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='project_number'>Projektnummer</Label>
							<Input
								id='project_number'
								{...register('project_number')}
								placeholder='Ex: 2025-001'
							/>
							{errors.project_number && (
								<p className='text-sm text-destructive'>
									{errors.project_number.message}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='client_name'>Kundnamn</Label>
							<Input
								id='client_name'
								{...register('client_name')}
								placeholder='Ex: Kungsbacka Fastigheter AB'
							/>
							{errors.client_name && (
								<p className='text-sm text-destructive'>{errors.client_name.message}</p>
							)}
						</div>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='site_address'>Platsadress</Label>
						<Input
							id='site_address'
							{...register('site_address')}
							placeholder='Ex: Storgatan 1, 434 30 Kungsbacka'
						/>
						{errors.site_address && (
							<p className='text-sm text-destructive'>{errors.site_address.message}</p>
						)}
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='status'>Status</Label>
							<Select
								value={status}
								onValueChange={(value) => setValue('status', value as any)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='active'>Aktiv</SelectItem>
									<SelectItem value='paused'>Pausad</SelectItem>
									<SelectItem value='completed'>Klar</SelectItem>
									<SelectItem value='archived'>Arkiverad</SelectItem>
								</SelectContent>
							</Select>
							{errors.status && (
								<p className='text-sm text-destructive'>{errors.status.message}</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='budget_mode'>Budgetläge</Label>
							<Select
								value={budgetMode}
								onValueChange={(value) => setValue('budget_mode', value as any)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>Ingen budget</SelectItem>
									<SelectItem value='hours'>Timbudget</SelectItem>
									<SelectItem value='amount'>Beloppsbudget</SelectItem>
								</SelectContent>
							</Select>
							{errors.budget_mode && (
								<p className='text-sm text-destructive'>{errors.budget_mode.message}</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Platsinställningar (Valfritt)</CardTitle>
					<CardDescription>
						Geo-fence inställningar för platsbaserade påminnelser (Kommer i Phase 2)
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-4 md:grid-cols-3'>
						<div className='space-y-2'>
							<Label htmlFor='site_lat'>Latitud</Label>
							<Input
								id='site_lat'
								type='number'
								step='any'
								{...register('site_lat', { valueAsNumber: true })}
								placeholder='57.491'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='site_lon'>Longitud</Label>
							<Input
								id='site_lon'
								type='number'
								step='any'
								{...register('site_lon', { valueAsNumber: true })}
								placeholder='12.068'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='geo_fence_radius_m'>Radie (meter)</Label>
							<Input
								id='geo_fence_radius_m'
								type='number'
								{...register('geo_fence_radius_m', { valueAsNumber: true })}
								placeholder='100'
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className='flex gap-3 justify-end'>
				<Button
					type='button'
					variant='outline'
					onClick={() => router.back()}
					disabled={isSubmitting}
				>
					Avbryt
				</Button>
				<Button type='submit' disabled={isSubmitting}>
					{isSubmitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
					{project?.id ? 'Uppdatera projekt' : 'Skapa projekt'}
				</Button>
			</div>
		</form>
	);
}

