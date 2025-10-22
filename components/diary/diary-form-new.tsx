'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, ArrowLeft, Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

interface DiaryFormNewProps {
	orgId: string;
	userId: string;
}

export function DiaryFormNew({ orgId, userId }: DiaryFormNewProps) {
	const router = useRouter();
	const supabase = createClient();
	
	const [project, setProject] = useState('');
	const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
	const [staffCount, setStaffCount] = useState('');
	const [weather, setWeather] = useState('');
	const [temperature, setTemperature] = useState('');
	const [workPerformed, setWorkPerformed] = useState('');
	const [obstacles, setObstacles] = useState('');
	const [safety, setSafety] = useState('');
	const [deliveries, setDeliveries] = useState('');
	const [visitors, setVisitors] = useState('');
	const [photos, setPhotos] = useState<File[]>([]);
	const [signature, setSignature] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Fetch projects
	const { data: projects = [] } = useQuery({
		queryKey: ['projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data;
		},
	});

	const weatherOptions = [
		{ value: 'sunny', label: '☀️ Soligt', icon: Sun },
		{ value: 'partly_cloudy', label: '⛅ Halvklart', icon: Cloud },
		{ value: 'cloudy', label: '☁️ Molnigt', icon: Cloud },
		{ value: 'rainy', label: '🌧️ Regn', icon: CloudRain },
		{ value: 'snow', label: '❄️ Snö', icon: CloudSnow },
		{ value: 'windy', label: '💨 Blåsigt', icon: Wind }
	];

	const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (photos.length + files.length > 10) {
			toast.error('Max 10 foton tillåtna');
			return;
		}
		setPhotos([...photos, ...files]);
	};

	const removePhoto = (index: number) => {
		setPhotos(photos.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!project) {
			toast.error('Vänligen välj ett projekt');
			return;
		}
		
		if (!date) {
			toast.error('Vänligen välj ett datum');
			return;
		}

		if (!signature.trim()) {
			toast.error('Signatur krävs för att spara dagboksposten');
			return;
		}

		setIsSubmitting(true);

		try {
			// Create diary entry
			const { data: entry, error: entryError } = await supabase
				.from('diary_entries')
				.insert({
					org_id: orgId,
					project_id: project,
					date,
					crew_count: staffCount ? parseInt(staffCount) : null,
					weather: weather || null,
					temperature_c: temperature ? parseFloat(temperature) : null,
					work_performed: workPerformed || null,
					obstacles: obstacles || null,
					safety_notes: safety || null,
					deliveries: deliveries || null,
					visitors: visitors || null,
					signed_by_name: signature,
					signed_at: new Date().toISOString(),
				})
				.select()
				.single();

			if (entryError) throw entryError;

			// Upload photos if any
			if (photos.length > 0) {
				for (let i = 0; i < photos.length; i++) {
					const photo = photos[i];
					const fileExt = photo.name.split('.').pop();
					const fileName = `${entry.id}-${i}-${Date.now()}.${fileExt}`;
					const filePath = `${orgId}/diary/${fileName}`;

					const { error: uploadError } = await supabase.storage
						.from('photos')
						.upload(filePath, photo);

					if (uploadError) throw uploadError;

					const { data: { publicUrl } } = supabase.storage
						.from('photos')
						.getPublicUrl(filePath);

					await supabase.from('diary_photos').insert({
						diary_entry_id: entry.id,
						photo_url: publicUrl,
						sort_order: i,
					});
				}
			}

			toast.success('Dagbokspost sparad!');
			router.push(`/dashboard/diary/${entry.id}`);
		} catch (error) {
			console.error('Error creating diary entry:', error);
			toast.error('Kunde inte spara dagboksposten');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSign = () => {
		if (!signature.trim()) {
			toast.error('Vänligen skriv ditt fullständiga namn');
			return;
		}
		toast.success(`Signatur bekräftad: ${signature}`);
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center gap-4'>
						<Button
							variant='ghost'
							size='icon'
							onClick={() => router.back()}
							disabled={isSubmitting}
						>
							<ArrowLeft className='h-5 w-5' />
						</Button>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Ny dagbokspost</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								Skapa en ny dagbokspost för ett projekt
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-3xl mx-auto'>
				<form onSubmit={handleSubmit} className='space-y-5'>
					{/* Project - REQUIRED */}
					<div className='space-y-2'>
						<Label htmlFor='project' className='flex items-center gap-1'>
							Projekt <span className='text-destructive'>*</span>
						</Label>
						<Select value={project} onValueChange={setProject}>
							<SelectTrigger id='project' className='h-11'>
								<SelectValue placeholder='Välj projekt' />
							</SelectTrigger>
							<SelectContent>
								{projects.map((proj) => (
									<SelectItem key={proj.id} value={proj.id}>
										{proj.project_number ? `${proj.project_number} - ` : ''}{proj.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Date and Staff Count */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='date' className='flex items-center gap-1'>
								Datum <span className='text-destructive'>*</span>
							</Label>
							<Input
								id='date'
								type='date'
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className='h-11'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='staffCount'>Antal bemanning</Label>
							<Input
								id='staffCount'
								type='number'
								min='0'
								value={staffCount}
								onChange={(e) => setStaffCount(e.target.value)}
								placeholder='0'
								className='h-11'
							/>
						</div>
					</div>

					{/* Weather and Temperature */}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='weather'>Väder</Label>
							<Select value={weather} onValueChange={setWeather}>
								<SelectTrigger id='weather' className='h-11'>
									<SelectValue placeholder='Välj väder' />
								</SelectTrigger>
								<SelectContent>
									{weatherOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='temperature'>Temperatur (°C)</Label>
							<Input
								id='temperature'
								type='number'
								min='-20'
								max='30'
								step='0.5'
								value={temperature}
								onChange={(e) => setTemperature(e.target.value)}
								placeholder='-20 till +30'
								className='h-11'
							/>
						</div>
					</div>

					{/* Work Performed */}
					<div className='space-y-2'>
						<Label htmlFor='workPerformed'>Utfört arbete</Label>
						<Textarea
							id='workPerformed'
							value={workPerformed}
							onChange={(e) => setWorkPerformed(e.target.value)}
							placeholder='Beskriv dagens arbetsmoment...'
							className='resize-none min-h-[100px]'
						/>
					</div>

					{/* Issues/Problems */}
					<div className='space-y-2'>
						<Label htmlFor='obstacles'>Hinder/problem</Label>
						<Textarea
							id='obstacles'
							value={obstacles}
							onChange={(e) => setObstacles(e.target.value)}
							placeholder='Eventuella problem eller hinder...'
							className='resize-none min-h-[100px]'
						/>
					</div>

					{/* Safety */}
					<div className='space-y-2'>
						<Label htmlFor='safety'>Säkerhet</Label>
						<Textarea
							id='safety'
							value={safety}
							onChange={(e) => setSafety(e.target.value)}
							placeholder='Säkerhet observations och incidenter...'
							className='resize-none min-h-[100px]'
						/>
					</div>

					{/* Deliveries */}
					<div className='space-y-2'>
						<Label htmlFor='deliveries'>Leveranser</Label>
						<Textarea
							id='deliveries'
							value={deliveries}
							onChange={(e) => setDeliveries(e.target.value)}
							placeholder='Material och leveranser som kommit...'
							className='resize-none min-h-[100px]'
						/>
					</div>

					{/* Visitors */}
					<div className='space-y-2'>
						<Label htmlFor='visitors'>Besökare</Label>
						<Textarea
							id='visitors'
							value={visitors}
							onChange={(e) => setVisitors(e.target.value)}
							placeholder='Besök från kunder, inspektörer etc...'
							className='resize-none min-h-[100px]'
						/>
					</div>

					{/* Photos */}
					<div className='space-y-2'>
						<Label>Foton (max 10)</Label>
						<div className='border-2 border-dashed border-border rounded-xl p-6 hover:border-primary/30 transition-colors'>
							{photos.length === 0 ? (
								<label className='w-full flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer'>
									<Upload className='w-8 h-8' />
									<span className='text-sm'>Lägg till foto (0/10)</span>
									<input
										type='file'
										accept='image/*'
										multiple
										onChange={handlePhotoUpload}
										className='hidden'
									/>
								</label>
							) : (
								<div className='space-y-3'>
									<div className='grid grid-cols-3 md:grid-cols-5 gap-2'>
										{photos.map((photo, index) => (
											<div key={index} className='relative aspect-square bg-muted rounded-lg overflow-hidden group'>
												<img
													src={URL.createObjectURL(photo)}
													alt={`Foto ${index + 1}`}
													className='w-full h-full object-cover'
												/>
												<button
													type='button'
													onClick={() => removePhoto(index)}
													className='absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
												>
													<X className='w-3 h-3' />
												</button>
											</div>
										))}
									</div>
									{photos.length < 10 && (
										<label>
											<Button
												type='button'
												variant='outline'
												className='w-full'
												asChild
											>
												<span>
													<Upload className='w-4 h-4 mr-2' />
													Lägg till fler ({photos.length}/10)
												</span>
											</Button>
											<input
												type='file'
												accept='image/*'
												multiple
												onChange={handlePhotoUpload}
												className='hidden'
											/>
										</label>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Signature - REQUIRED */}
					<div className='space-y-2 p-4 bg-accent/50 rounded-xl border-2 border-primary/20'>
						<Label htmlFor='signature' className='flex items-center gap-2'>
							<span>Signatur <span className='text-destructive'>(obligatoriskt)</span></span>
						</Label>
						<div className='flex gap-2'>
							<Input
								id='signature'
								value={signature}
								onChange={(e) => setSignature(e.target.value)}
								placeholder='Skriv ditt fullständiga namn'
								className='h-11 flex-1'
							/>
							<Button
								type='button'
								variant='outline'
								onClick={handleSign}
								className='shrink-0'
							>
								Signera
							</Button>
						</div>
						<div className='space-y-1 mt-3'>
							<p className='text-xs text-muted-foreground'>
								Genom att signera bekräftar du att informationen är korrekt
							</p>
							<p className='text-xs text-muted-foreground'>
								Signatur krävs för att spara dagboksposten
							</p>
						</div>
					</div>

					{/* Actions */}
					<div className='flex gap-3 pt-4'>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='flex-1 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
						>
							{isSubmitting ? 'Sparar...' : 'Spara dagbokspost'}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}

