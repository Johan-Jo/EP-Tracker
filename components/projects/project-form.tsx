'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormData, type AlertSettings } from '@/lib/schemas/project';
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
import { ProjectAlertSettings } from './project-alert-settings';

interface ProjectFormProps {
	project?: ProjectFormData & { id?: string };
	orgId: string;
	onSubmit: (data: ProjectFormData) => Promise<{ success: boolean; project: any }>;
}

export function ProjectForm({ project, orgId, onSubmit }: ProjectFormProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Initialize alert settings state
	const defaultAlertSettings: AlertSettings = {
		work_day_start: '07:00',
		work_day_end: '16:00',
		notify_on_checkin: true,
		notify_on_checkout: true,
		checkin_reminder_enabled: false,
		checkin_reminder_minutes_before: 15,
		checkout_reminder_enabled: false,
		checkout_reminder_minutes_before: 15,
		late_checkin_enabled: false,
		late_checkin_minutes_after: 15,
		forgotten_checkout_enabled: false,
		forgotten_checkout_minutes_after: 30,
		alert_recipients: ['admin', 'foreman'],
	};

	const [alertSettings, setAlertSettings] = useState<AlertSettings>(
		project?.alert_settings || defaultAlertSettings
	);

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
			budget_hours: null,
			budget_amount: null,
			status: 'active' as const,
			alert_settings: defaultAlertSettings,
		},
	});

	const budgetMode = watch('budget_mode');
	const status = watch('status');

	const handleFormSubmit = async (data: any) => {
		setIsSubmitting(true);
		setError(null);

		try {
			// Include alert_settings in submission
			const projectData: ProjectFormData = {
				...data,
				alert_settings: alertSettings,
			};

			const result = await onSubmit(projectData);
			
			// Client-side redirect to avoid NEXT_REDIRECT error
			if (result.success && result.project?.id) {
				router.push(`/dashboard/projects/${result.project.id}`);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
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

			<Card className='border-2 hover:border-gray-300 transition-colors shadow-sm'>
				<CardHeader className='bg-gray-50/50'>
					<CardTitle className='text-xl'>Grunduppgifter</CardTitle>
					<CardDescription>
						Fyll i projektets grundläggande information
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
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

					{/* Budget input fields - show based on selected budget mode */}
					{budgetMode === 'hours' && (
						<div className='space-y-2'>
							<Label htmlFor='budget_hours'>
								Budget (timmar) <span className='text-destructive'>*</span>
							</Label>
							<Input
								id='budget_hours'
								type='number'
								step='0.5'
								{...register('budget_hours', { valueAsNumber: true })}
								placeholder='Ex: 125'
							/>
							{errors.budget_hours && (
								<p className='text-sm text-destructive'>{errors.budget_hours.message}</p>
							)}
							<p className='text-xs text-muted-foreground'>
								Ange planerade timmar för projektet
							</p>
						</div>
					)}

					{budgetMode === 'amount' && (
						<div className='space-y-2'>
							<Label htmlFor='budget_amount'>
								Budget (kronor) <span className='text-destructive'>*</span>
							</Label>
							<Input
								id='budget_amount'
								type='number'
								step='1'
								{...register('budget_amount', { valueAsNumber: true })}
								placeholder='Ex: 250000'
							/>
							{errors.budget_amount && (
								<p className='text-sm text-destructive'>{errors.budget_amount.message}</p>
							)}
							<p className='text-xs text-muted-foreground'>
								Ange budget i svenska kronor (SEK)
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className='border-2 hover:border-gray-300 transition-colors shadow-sm'>
				<CardHeader className='bg-gray-50/50'>
					<CardTitle className='text-xl'>Platsinställningar (Valfritt)</CardTitle>
					<CardDescription>
						Geo-fence inställningar för platsbaserade påminnelser (Kommer i Phase 2)
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
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

			{/* Alert Settings */}
			<ProjectAlertSettings
				settings={alertSettings}
				onChange={setAlertSettings}
				disabled={isSubmitting}
			/>

			<div className='flex gap-3 justify-end pt-2'>
				<Button
					type='button'
					variant='outline'
					onClick={() => router.back()}
					disabled={isSubmitting}
					className='min-w-[120px]'
				>
					Avbryt
				</Button>
				<Button 
					type='submit' 
					disabled={isSubmitting}
					className='min-w-[160px] bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200'
				>
					{isSubmitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
					{project?.id ? 'Uppdatera projekt' : 'Skapa projekt'}
				</Button>
			</div>
		</form>
	);
}

