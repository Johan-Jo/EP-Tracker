'use client';

import { useEffect, useState } from 'react';
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
import { Loader2, QrCode } from 'lucide-react';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';
import { AddressMap } from '@/components/address/address-map';
import { ProjectAlertSettings } from './project-alert-settings';
import { QRDialog } from '@/components/worksites/qr-dialog';

interface ProjectFormProps {
	project?: ProjectFormData & { id?: string };
	orgId: string;
	onSubmit: (data: ProjectFormData) => Promise<{ success: boolean; project: any }>;
}

export function ProjectForm({ project, orgId, onSubmit }: ProjectFormProps) {
const router = useRouter();
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
	const [useProjectAddress, setUseProjectAddress] = useState(false);
	// Separate state for Personalliggare address fields (can differ from project address)
	const [worksiteAddress, setWorksiteAddress] = useState({
		address_line1: project?.address_line1 || '',
		address_line2: project?.address_line2 || '',
		postal_code: project?.postal_code || '',
		city: project?.city || '',
	});

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

	// QR dialog states
	const [showPlatsQR, setShowPlatsQR] = useState(false);
	const [showKontrollQR, setShowKontrollQR] = useState(false);
	const [controlQRToken, setControlQRToken] = useState<string | null>(null);
	const [controlQRExpiresAt, setControlQRExpiresAt] = useState<Date | null>(null);

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
	// Defaults requested: Stockholm/Sverige
	timezone: 'Europe/Stockholm',
	country: 'Sverige',
	retention_years: 2, // Automatiskt 2 år enligt lagkrav
	 alert_settings: defaultAlertSettings,
		},
		});

	const budgetMode = watch('budget_mode');
	const status = watch('status');
	const siteAddress = watch('site_address');
	const addr1 = watch('address_line1');
	const postal = watch('postal_code');
	const city = watch('city');
	const projNumber = watch('project_number');
	const projName = watch('name');

	// Parse a Swedish-style address "Gata 1, 123 45 Stad"
	function parseAddress(input?: string | null): { address1?: string; postal_code?: string; city?: string } {
		if (!input) return {};
		const [first, restRaw] = String(input).split(',');
		const address1 = first?.trim();
		const rest = restRaw?.trim() || '';
		const m = rest.match(/(\d{3}\s?\d{2})\s*(.+)$/);
		if (!m) return { address1 };
		return { address1, postal_code: m[1].replace(/\s+/g, ' '), city: m[2].trim() };
	}

	// Sluggify name for fallback worksite code
	function slugify(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '')
			.slice(0, 16);
	}

	// Sync Personalliggare address from project address when checkbox is checked
	useEffect(() => {
		if (useProjectAddress) {
			const projAddr1 = watch('address_line1') || '';
			const projAddr2 = watch('address_line2') || '';
			const projPostal = watch('postal_code') || '';
			const projCity = watch('city') || '';
			setWorksiteAddress({ address_line1: projAddr1, address_line2: projAddr2, postal_code: projPostal, city: projCity });
			// Also update the form values for Personalliggare
			setValue('address_line1', projAddr1, { shouldDirty: true });
			setValue('address_line2', projAddr2, { shouldDirty: true });
			setValue('postal_code', projPostal, { shouldDirty: true });
			setValue('city', projCity, { shouldDirty: true });
		}
	}, [useProjectAddress, addr1, postal, city, setValue, watch]);

	useEffect(() => {
		// Suggest worksite_code from project_number or name
		if (!watch('worksite_code')) {
			if (projNumber) setValue('worksite_code', String(projNumber).slice(0, 16));
			else if (projName) setValue('worksite_code', slugify(projName));
		}
	}, [projNumber, projName, setValue]);

	// QR generation handlers
	const handleGeneratePlatsQR = () => {
		if (!project?.id) {
			setError('Spara projektet först innan du genererar QR-kod');
			return;
		}
		// For now, just show the URL - could generate actual check-in URL later
		const baseUrl = window.location.origin;
		const projectId = project.id;
		// TODO: Generate actual check-in URL when the endpoint is ready
		setShowPlatsQR(true);
	};

	const handleGenerateKontrollQR = async () => {
		if (!project?.id) {
			setError('Spara projektet först innan du genererar Kontroll-QR');
			return;
		}
		try {
			// Call API to generate control token
			const response = await fetch(`/api/worksites/${project.id}/control-token`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to generate control token');
			const data = await response.json();
			setControlQRToken(data.token);
			setControlQRExpiresAt(new Date(data.expires_at));
			setShowKontrollQR(true);
		} catch (err) {
			setError('Kunde inte generera Kontroll-QR');
		}
	};

	const handleFormSubmit = async (data: any) => {
		setIsSubmitting(true);
		setError(null);

		try {
			// Include alert_settings in submission and enforce defaults
			// If useProjectAddress is checked, use project's address; otherwise use Personalliggare's separate address
			const finalAddress = useProjectAddress ? {
				address_line1: data.address_line1 || null,
				address_line2: data.address_line2 || null,
				postal_code: data.postal_code || null,
				city: data.city || null,
			} : {
				address_line1: worksiteAddress.address_line1 || data.address_line1 || null,
				address_line2: worksiteAddress.address_line2 || data.address_line2 || null,
				postal_code: worksiteAddress.postal_code || data.postal_code || null,
				city: worksiteAddress.city || data.city || null,
			};
			
			const projectData: ProjectFormData = {
				...data,
				...finalAddress,
				timezone: data?.timezone ?? 'Europe/Stockholm',
				country: data?.country ?? 'Sverige',
				retention_years: 2, // Automatiskt 2 år från idag enligt lagkrav
				alert_settings: alertSettings,
			};

			console.log('Submitting project:', { useProjectAddress, finalAddress, projectData });

			const result = await onSubmit(projectData);
			
			console.log('Submit result:', result);
			
			// Client-side redirect to avoid NEXT_REDIRECT error
			if (result.success && result.project?.id) {
				router.push(`/dashboard/projects/${result.project.id}`);
			} else if (!result.success) {
				setError('Kunde inte skapa projekt');
				setIsSubmitting(false);
			}
		} catch (err) {
			console.error('Form submit error:', err);
			setError(err instanceof Error ? err.message : 'Ett fel uppstod');
			setIsSubmitting(false);
		}
	};

	return (
		<>
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
						autoComplete='organization'
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
							autoComplete='off'
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
							autoComplete='organization'
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
						autoComplete='street-address'
						 placeholder='Ex: Observatoriegatan 13, 113 29 Stockholm'
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
								<SelectTrigger id='status' name='status'>
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
								<SelectTrigger id='budget_mode' name='budget_mode'>
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
		<CardTitle className='text-xl'>Platsinställningar</CardTitle>
		</CardHeader>
			<CardContent className='space-y-4 pt-6'>
	<div className='space-y-2'>
	<Label>Karta</Label>
	<AddressMap lat={watch('site_lat') ?? null} lon={watch('site_lon') ?? null} />
	</div>
	<div className='grid gap-4 md:grid-cols-2'>
		<div className='space-y-2'>
		<Label htmlFor='site_lat'>Latitud</Label>
		<Input
		id='site_lat'
		type='number'
		step='any'
		 {...register('site_lat', { valueAsNumber: true })}
		  placeholder='57.491'
						className='text-xs'
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
		    className='text-xs'
		   />
						</div>
					</div>
					</CardContent>
				</Card>

			<Card className='border-2 hover:border-gray-300 transition-colors shadow-sm'>
				<CardHeader className='bg-gray-50/50'>
					<CardTitle className='text-xl'>Personalliggare / Platsdata</CardTitle>
					<CardDescription>
						Aktivera personalliggare och fyll i nödvändig platsinformation
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
					<div className='flex items-center justify-between border rounded-lg p-3'>
						<div>
							<Label htmlFor='worksite_enabled' className='font-medium cursor-pointer'>Aktivera personalliggare</Label>
							<p className='text-sm text-muted-foreground'>Kräver platsdata nedan</p>
						</div>
						<div>
						<input
						 id='worksite_enabled'
						type='checkbox'
						className='h-5 w-5'
						{...register('worksite_enabled')}
						/>
						</div>
					</div>

					{project?.id && (
						<div className='flex gap-2'>
							<Button
								type='button'
								variant='outline'
								onClick={handleGeneratePlatsQR}
								className='flex items-center gap-2'
							>
								<QrCode className='w-4 h-4' />
								Plats-QR
							</Button>
							<Button
								type='button'
								variant='outline'
								onClick={handleGenerateKontrollQR}
								className='flex items-center gap-2'
							>
								<QrCode className='w-4 h-4' />
								Kontroll-QR
							</Button>
						</div>
					)}

					<div className='grid gap-4 md:grid-cols-3'>
						<div className='space-y-2'>
							<Label htmlFor='worksite_code'>Plats-ID (visningskod)</Label>
							<Input id='worksite_code' {...register('worksite_code')} autoComplete='off' placeholder='Ex: KUNGS-PLATS-A'/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='building_id'>Byggarbetsplats-ID</Label>
							<Input id='building_id' {...register('building_id')} autoComplete='off' placeholder='Valfritt'/>
						</div>
					</div>

					<div className='border rounded-lg p-3 bg-muted/30'>
						<label htmlFor='use_project_address' className='flex items-center gap-2 text-sm font-medium mb-3'>
						<input id='use_project_address' name='use_project_address' type='checkbox' className='h-4 w-4' checked={useProjectAddress} onChange={(e) => setUseProjectAddress(e.target.checked)} />
							<span>Använd projektets adress</span>
						</label>
						<p className='text-xs text-muted-foreground ml-6'>Om ikryssad kopieras adressen från Grunduppgifter ovan och fälten nedan låses</p>
					</div>

					<div className='grid gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label htmlFor='worksite_address_line1'>Gatuadress</Label>
							{useProjectAddress ? (
								<Input 
									id='worksite_address_line1'
									name='worksite_address_line1'
									autoComplete='address-line1'
									disabled={true} 
									value={watch('address_line1') || ''}
							/>
							) : (
								<AddressAutocomplete
									id='worksite_address_line1'
									name='worksite_address_line1'
									autoComplete='address-line1'
									value={worksiteAddress.address_line1}
									onChange={(val) => {
										const updated = { ...worksiteAddress, address_line1: val };
										setWorksiteAddress(updated);
										setValue('address_line1', val, { shouldDirty: true });
								}}
									onSelect={(addr) => {
									// Ensure numbers for coordinates
									const latNum = typeof addr.lat === 'number' ? addr.lat : parseFloat(String(addr.lat));
									const lonNum = typeof addr.lon === 'number' ? addr.lon : parseFloat(String(addr.lon));
									
									// Remove country from address fields
									let addr1Clean = addr.address_line1 || '';
									addr1Clean = addr1Clean.replace(/,\s*(sweden|sverige)$/i, '').trim();
									
									let cityClean = addr.city || '';
									cityClean = cityClean.replace(/,\s*(sweden|sverige)$/i, '').trim();
								const postalCity = `${addr.postal_code} ${cityClean}`.trim();
									
									const updated = {
									address_line1: addr1Clean,
									address_line2: postalCity,
									 postal_code: addr.postal_code,
									 city: addr.city,
									};
									setWorksiteAddress(updated);
									setValue('address_line1', addr1Clean, { shouldDirty: true });
									setValue('address_line2', postalCity, { shouldDirty: true });
									// Keep postal_code and city for backwards compatibility
									setValue('postal_code', addr.postal_code, { shouldDirty: true });
									 setValue('city', addr.city, { shouldDirty: true });
									setValue('site_lat', latNum, { shouldDirty: true, shouldValidate: true });
									setValue('site_lon', lonNum, { shouldDirty: true, shouldValidate: true });
									console.log('Personalliggare: Set coordinates:', { lat: latNum, lon: lonNum, original: { lat: addr.lat, lon: addr.lon } });
								}}
									placeholder='Sök adress (Geoapify)...'
									disabled={useProjectAddress}
							/>
							)}
						</div>
						<div className='space-y-2'>
							<Label htmlFor='worksite_address_line2'>Postnummer & Stad</Label>
							<Input 
								id='worksite_address_line2'
								name='worksite_address_line2'
								autoComplete='postal-code'
								disabled={useProjectAddress}
								value={useProjectAddress ? (watch('address_line2') || '') : worksiteAddress.address_line2}
								onChange={(e) => {
									if (!useProjectAddress) {
										const updated = { ...worksiteAddress, address_line2: e.target.value };
										setWorksiteAddress(updated);
										setValue('address_line2', e.target.value, { shouldDirty: true });
									}
								}}
								placeholder='Ex: 113 29 Stockholm'
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

	{/* QR Dialogs */}
	{project?.id && (
		<QRDialog
			open={showPlatsQR}
			onOpenChange={setShowPlatsQR}
			title='Plats-QR'
			description='Använd denna QR-kod för att tillåta incheckning på platsen'
			value={`${window.location.origin}/worksites/${project.id}/checkin`}
		/>
	)}
	{project?.id && controlQRToken && (
		<QRDialog
			open={showKontrollQR}
			onOpenChange={setShowKontrollQR}
			title='Kontroll-QR'
			description='Använd denna QR-kod för att visa kontrollvyn (engångstoken)'
			value={`${window.location.origin}/worksites/${project.id}/control?token=${controlQRToken}`}
			expiresAt={controlQRExpiresAt || undefined}
		/>
	)}
	</>
	);
}

