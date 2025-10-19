'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const diarySchema = z.object({
	project_id: z.string().uuid('Välj ett projekt'),
	date: z.string().min(1, 'Datum krävs'),
	weather: z.string().optional(),
	temperature_c: z.string().optional(),
	crew_count: z.string().optional(),
	work_performed: z.string().optional(),
	obstacles: z.string().optional(),
	safety_notes: z.string().optional(),
	deliveries: z.string().optional(),
	visitors: z.string().optional(),
});

type DiaryFormData = z.infer<typeof diarySchema>;

interface DiaryFormProps {
	projectId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

const weatherOptions = [
	{ value: 'sunny', label: '☀️ Soligt' },
	{ value: 'partly_cloudy', label: '⛅ Halvklart' },
	{ value: 'cloudy', label: '☁️ Molnigt' },
	{ value: 'rainy', label: '🌧️ Regn' },
	{ value: 'snow', label: '❄️ Snö' },
	{ value: 'windy', label: '💨 Blåsigt' },
];

export function DiaryForm({ projectId, onSuccess, onCancel }: DiaryFormProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const [signatureName, setSignatureName] = useState('');
	const queryClient = useQueryClient();
	const supabase = createClient();

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
			date: new Date().toISOString().split('T')[0],
		},
	});

	const createDiaryMutation = useMutation({
		mutationFn: async (data: DiaryFormData) => {
			// Add signature if provided
			const diaryData = signatureName
				? {
						...data,
						signature_name: signatureName,
						signature_timestamp: new Date().toISOString(),
				  }
				: data;

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
			queryClient.invalidateQueries({ queryKey: ['diary'] });
			onSuccess?.();
		},
	});

	const uploadPhotos = async (diaryId: string) => {
		for (let i = 0; i < photos.length; i++) {
			const photo = photos[i];
			const fileExt = photo.name.split('.').pop();
			const fileName = `${diaryId}/${crypto.randomUUID()}.${fileExt}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('diary-photos')
				.upload(fileName, photo);

			if (uploadError) {
				console.error('Photo upload error:', uploadError);
				continue;
			}

			const { data: urlData } = supabase.storage
				.from('diary-photos')
				.getPublicUrl(fileName);

			// Save photo record
			await fetch('/api/diary/photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					diary_entry_id: diaryId,
					photo_url: urlData.publicUrl,
					sort_order: i,
				}),
			});
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
		if (!signatureName.trim()) {
			alert('Signatur krävs för att spara dagboksposten');
			return;
		}
		createDiaryMutation.mutate(data);
	};

	const selectedWeather = watch('weather');

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
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
							<label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
								<div className="flex flex-col items-center gap-2">
									<ImagePlus className="h-8 w-8 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										Lägg till foto ({photos.length}/10)
									</span>
								</div>
								<input
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={handlePhotoChange}
								/>
							</label>
						)}
					</div>
				</div>

				{/* Signature */}
				<div>
					<Label htmlFor="signature_name">Signatur (namn) *</Label>
					<Input
						id="signature_name"
						value={signatureName}
						onChange={(e) => setSignatureName(e.target.value)}
						placeholder="Ditt fullständiga namn"
					/>
					<p className="text-xs text-muted-foreground mt-1">
						Genom att ange ditt namn bekräftar du att uppgifterna är korrekta
					</p>
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

