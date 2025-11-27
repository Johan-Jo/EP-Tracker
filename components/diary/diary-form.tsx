'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SignatureInput } from '@/components/shared/signature-input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PhotoUploadButtons } from '@/components/shared/photo-upload-buttons';

const diarySchema = z.object({
	project_id: z.string().uuid('Välj ett projekt'),
	work_order_id: z.string().uuid().nullable().optional(),
	date: z.string().min(1, 'Datum krävs'),
	weather: z.string().optional().nullable(),
	temperature_c: z.string().optional().nullable(),
	crew_count: z.string().optional().nullable(),
	work_performed: z.string().optional().nullable(),
	obstacles: z.string().optional().nullable(),
	safety_notes: z.string().optional().nullable(),
	deliveries: z.string().optional().nullable(),
	visitors: z.string().optional().nullable(),
});

type DiaryFormData = z.infer<typeof diarySchema>;

interface DiaryFormProps {
	projectId?: string;
	workOrderId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

interface WorkOrderOption {
	id: string;
	work_order_number: string;
	title: string;
}

const weatherOptions = [
	{ value: 'sunny', label: '☀️ Soligt' },
	{ value: 'partly_cloudy', label: '⛅ Halvklart' },
	{ value: 'cloudy', label: '☁️ Molnigt' },
	{ value: 'rainy', label: '🌧️ Regn' },
	{ value: 'snow', label: '❄️ Snö' },
	{ value: 'windy', label: '💨 Blåsigt' },
];

export function DiaryForm({ projectId, workOrderId, onSuccess, onCancel }: DiaryFormProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const [signature, setSignature] = useState<{ name: string; timestamp: string } | null>(null);
	const queryClient = useQueryClient();
	const supabase = createClient();
	const router = useRouter();

	// Fetch projects for dropdown
	const { data: projects } = useQuery({
		queryKey: ['projects'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.order('created_at', { ascending: false });
			if (error) throw error;
			return data;
		},
	});

	const selectedProjectId = watch('project_id');

	// Fetch work orders for selected project
	const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrderOption[]>({
		queryKey: ['work-orders-by-project', selectedProjectId],
		queryFn: async () => {
			if (!selectedProjectId) return [];
			// Get org_id from projects
			const { data: project } = await supabase
				.from('projects')
				.select('org_id')
				.eq('id', selectedProjectId)
				.single();
			
			if (!project) return [];
			
			const { data, error } = await supabase
				.from('work_orders')
				.select('id, work_order_number, title')
				.eq('organization_id', project.org_id)
				.eq('project_id', selectedProjectId)
				.order('created_at', { ascending: false });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProjectId,
		staleTime: 60 * 1000,
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<DiaryFormData>({
		resolver: zodResolver(diarySchema),
		defaultValues: {
			project_id: projectId || '',
			work_order_id: workOrderId || null,
			date: new Date().toISOString().split('T')[0],
		},
	});

	// Set work_order_id when workOrderId prop changes
	useEffect(() => {
		if (workOrderId) {
			setValue('work_order_id', workOrderId);
		}
	}, [workOrderId, setValue]);

	const createDiaryMutation = useMutation({
		mutationFn: async (data: DiaryFormData) => {
			// Convert empty strings to null for numeric fields
			const cleanedData = {
				...data,
				temperature_c: data.temperature_c ? data.temperature_c : null,
				crew_count: data.crew_count ? data.crew_count : null,
			};

			// Add signature if provided
			const diaryData = signature
			? {
					...cleanedData,
					signature_name: signature.name,
					signature_timestamp: signature.timestamp,
			  }
			: cleanedData;

			// Create diary entry
			const response = await fetch('/api/diary', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(diaryData),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa dagbokspost');
			}

			const { diary } = await response.json();

			// Upload photos if any
			if (photos.length > 0) {
				await uploadPhotos(diary.id);
			}

			return diary;
		},
		onSuccess: () => {
			toast.success('Dagbokspost sparad!');
			queryClient.invalidateQueries({ queryKey: ['diary'] });
			
			if (onSuccess) {
				onSuccess();
			} else {
				// Redirect to diary list after a short delay to show toast
				setTimeout(() => {
					router.push('/dashboard/diary');
					router.refresh();
				}, 1000);
			}
		},
		onError: (error: Error) => {
			console.error('Diary save error:', error);
			toast.error(error.message || 'Kunde inte spara dagbokspost');
		},
	});

	const uploadPhotos = async (diaryId: string) => {
		for (let i = 0; i < photos.length; i++) {
			const photo = photos[i];
			const fileExt = photo.name.split('.').pop();
			const fileName = `${diaryId}/${crypto.randomUUID()}.${fileExt}`;

			const { error: uploadError } = await supabase.storage
				.from('diary-photos')
				.upload(fileName, photo);

			if (uploadError) {
				console.error('Photo upload error:', uploadError);
				toast.error(`Kunde inte ladda upp foto ${i + 1}: ${uploadError.message}`);
				continue;
			}

			const { data: urlData } = supabase.storage
				.from('diary-photos')
				.getPublicUrl(fileName);

			// Save photo record
			const response = await fetch('/api/diary/photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					diary_entry_id: diaryId,
					photo_url: urlData.publicUrl,
					sort_order: i,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to save photo record:', error);
				toast.error(`Kunde inte spara foto ${i + 1} i databasen`);
			}
		}
	};

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (photos.length + files.length > 10) {
			alert('Max 10 foton tillåtna');
			return;
		}

		setPhotos([...photos, ...files]);

		// Create previews
		files.forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotosPreviews((prev) => [...prev, reader.result as string]);
			};
			reader.readAsDataURL(file);
		});
	};

	const removePhoto = (index: number) => {
		setPhotos(photos.filter((_, i) => i !== index));
		setPhotosPreviews(photosPreviews.filter((_, i) => i !== index));
	};

	const onSubmit = (data: DiaryFormData) => {
		if (!signature) {
			toast.error('Signatur krävs för att spara dagboksposten');
			return;
		}
		createDiaryMutation.mutate(data);
	};

	const selectedWeather = watch('weather');
	const selectedProject = watch('project_id');

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				{!projectId && (
					<div>
						<Label htmlFor="project_id">Projekt *</Label>
						<Select
							value={selectedProject || ''}
							onValueChange={(value) => {
								setValue('project_id', value);
								// Clear work_order_id when project changes
								setValue('work_order_id', null);
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj projekt" />
							</SelectTrigger>
							<SelectContent>
								{projects?.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.project_number ? `${project.project_number} - ` : ''}{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.project_id && (
							<p className="text-sm text-destructive mt-1">{errors.project_id.message}</p>
						)}
					</div>
				)}

				{/* Work Order Dropdown - only show if project is selected and has work orders */}
				{selectedProject && (workOrdersLoading || workOrders.length > 0) && (
					<div>
						<Label htmlFor="work_order_id">Arbetsorder (valfritt)</Label>
						{workOrdersLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Laddar arbetsorder...
							</div>
						) : workOrders.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Inga arbetsorder kopplade till detta projekt ännu.
							</p>
						) : (
							<Select
								value={watch('work_order_id') || 'none'}
								onValueChange={(value) => {
									if (value === 'none') {
										setValue('work_order_id', null);
									} else {
										setValue('work_order_id', value);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj arbetsorder (eller lämna tomt)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Ingen arbetsorder</SelectItem>
									{workOrders.map((wo) => (
										<SelectItem key={wo.id} value={wo.id}>
											{wo.work_order_number ? `${wo.work_order_number} – ` : ''}
											{wo.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				)}

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="date">Datum *</Label>
						<Input
							id="date"
							type="date"
							{...register('date')}
						/>
						{errors.date && (
							<p className="text-sm text-destructive mt-1">{errors.date.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="crew_count">Antal bemanning</Label>
						<Input
							id="crew_count"
							type="number"
							{...register('crew_count')}
							placeholder="0"
						/>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="weather">Väder</Label>
						<Select
							value={selectedWeather || ''}
							onValueChange={(value) => setValue('weather', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj väder" />
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

					<div>
						<Label htmlFor="temperature_c">Temperatur (°C)</Label>
						<Input
							id="temperature_c"
							type="number"
							{...register('temperature_c')}
							placeholder="-20 till +30"
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="work_performed">Utfört arbete</Label>
					<Textarea
						id="work_performed"
						{...register('work_performed')}
						placeholder="Beskriv dagens arbetsmoment..."
						rows={3}
					/>
				</div>

				<div>
					<Label htmlFor="obstacles">Hinder/problem</Label>
					<Textarea
						id="obstacles"
						{...register('obstacles')}
						placeholder="Eventuella problem eller hinder..."
						rows={2}
					/>
				</div>

				<div>
					<Label htmlFor="safety_notes">Säkerhet</Label>
					<Textarea
						id="safety_notes"
						{...register('safety_notes')}
						placeholder="Säkerhets observations och incidenter..."
						rows={2}
					/>
				</div>

				<div>
					<Label htmlFor="deliveries">Leveranser</Label>
					<Textarea
						id="deliveries"
						{...register('deliveries')}
						placeholder="Material och leveranser som kommit..."
						rows={2}
					/>
				</div>

				<div>
					<Label htmlFor="visitors">Besökare</Label>
					<Textarea
						id="visitors"
						{...register('visitors')}
						placeholder="Besök från kunder, inspektörer etc..."
						rows={2}
					/>
				</div>

				{/* Photo Upload */}
				<div>
					<Label>Foton (max 10)</Label>
					<div className="mt-2 space-y-4">
						{photosPreviews.length > 0 && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{photosPreviews.map((preview, index) => (
									<div key={index} className="relative aspect-square">
										<img
											src={preview}
											alt={`Preview ${index + 1}`}
											className="w-full h-full object-cover rounded-lg"
										/>
										<Button
											type="button"
											variant="destructive"
											size="icon"
											className="absolute top-2 right-2 h-6 w-6"
											onClick={() => removePhoto(index)}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}

						{photos.length < 10 && (
							<PhotoUploadButtons
								onFileChange={handlePhotoChange}
								onCameraChange={handlePhotoChange}
								disabled={createDiaryMutation.isPending}
								fileLabel="Välj fil"
								cameraLabel="Ta foto"
								fileButtonVariant="outline"
								cameraButtonVariant="default"
								fileButtonClassName="flex-1"
								cameraButtonClassName="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
							/>
						)}
						<p className="text-xs text-muted-foreground">
							{photos.length} av 10 bilder uppladdade
						</p>
					</div>
				</div>

				{/* Signature */}
				<div className="border-t pt-6">
					<SignatureInput
						onSign={setSignature}
						label="Signatur (obligatoriskt)"
						existingSignature={signature}
					/>
					{!signature && (
						<p className="text-sm text-destructive mt-2">
							Signatur krävs för att spara dagboksposten
						</p>
					)}
				</div>
			</div>

			<div className="flex gap-3 justify-end">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={createDiaryMutation.isPending}
					>
						Avbryt
					</Button>
				)}
				<Button type="submit" disabled={createDiaryMutation.isPending}>
					{createDiaryMutation.isPending && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					Spara dagbokspost
				</Button>
			</div>
		</form>
	);
}

