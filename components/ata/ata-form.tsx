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
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const ataSchema = z.object({
	project_id: z.string().uuid('Välj ett projekt'),
	title: z.string().min(1, 'Titel krävs'),
	description: z.string().optional(),
	qty: z.string().optional(),
	unit: z.string().optional(),
	unit_price_sek: z.string().optional(),
	ata_number: z.string().optional(),
});

type AtaFormData = z.infer<typeof ataSchema>;

interface AtaFormProps {
	projectId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function AtaForm({ projectId, onSuccess, onCancel }: AtaFormProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const queryClient = useQueryClient();
	const supabase = createClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<AtaFormData>({
		resolver: zodResolver(ataSchema),
		defaultValues: {
			project_id: projectId || '',
		},
	});

	const createAtaMutation = useMutation({
		mutationFn: async (data: AtaFormData) => {
			// Create ÄTA entry
			const response = await fetch('/api/ata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa ÄTA');
			}

			const { ata } = await response.json();

			// Upload photos if any
			if (photos.length > 0) {
				await uploadPhotos(ata.id);
			}

			return ata;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['ata'] });
			onSuccess?.();
		},
	});

	const uploadPhotos = async (ataId: string) => {
		for (let i = 0; i < photos.length; i++) {
			const photo = photos[i];
			const fileExt = photo.name.split('.').pop();
			const fileName = `${ataId}/${crypto.randomUUID()}.${fileExt}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('ata-photos')
				.upload(fileName, photo);

			if (uploadError) {
				console.error('Photo upload error:', uploadError);
				continue;
			}

			const { data: urlData } = supabase.storage
				.from('ata-photos')
				.getPublicUrl(fileName);

			// Save photo record
			await fetch('/api/ata/photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ata_id: ataId,
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

	const onSubmit = (data: AtaFormData) => {
		createAtaMutation.mutate(data);
	};

	const qty = watch('qty');
	const unitPrice = watch('unit_price_sek');
	const total = qty && unitPrice ? Number(qty) * Number(unitPrice) : 0;

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				<div>
					<Label htmlFor="ata_number">ÄTA-nummer (valfritt)</Label>
					<Input
						id="ata_number"
						{...register('ata_number')}
						placeholder="t.ex. ÄTA-001"
					/>
				</div>

				<div>
					<Label htmlFor="title">Titel *</Label>
					<Input
						id="title"
						{...register('title')}
						placeholder="t.ex. Extra eluttag i kök"
					/>
					{errors.title && (
						<p className="text-sm text-destructive mt-1">{errors.title.message}</p>
					)}
				</div>

				<div>
					<Label htmlFor="description">Beskrivning</Label>
					<Textarea
						id="description"
						{...register('description')}
						placeholder="Beskriv arbetet i detalj..."
						rows={4}
					/>
				</div>

				<div className="grid grid-cols-3 gap-4">
					<div>
						<Label htmlFor="qty">Kvantitet</Label>
						<Input
							id="qty"
							type="number"
							step="0.01"
							{...register('qty')}
							placeholder="0"
						/>
						{errors.qty && (
							<p className="text-sm text-destructive mt-1">{errors.qty.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="unit">Enhet</Label>
						<Input
							id="unit"
							{...register('unit')}
							placeholder="st, m², tim"
						/>
					</div>

					<div>
						<Label htmlFor="unit_price_sek">À-pris (SEK)</Label>
						<Input
							id="unit_price_sek"
							type="number"
							step="0.01"
							{...register('unit_price_sek')}
							placeholder="0.00"
						/>
						{errors.unit_price_sek && (
							<p className="text-sm text-destructive mt-1">{errors.unit_price_sek.message}</p>
						)}
					</div>
				</div>

				{total > 0 && (
					<Card className="bg-muted">
						<CardContent className="p-4">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Totalt:</span>
								<span className="text-lg font-bold">{total.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK</span>
							</div>
						</CardContent>
					</Card>
				)}

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
			</div>

			<div className="flex gap-3 justify-end">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={createAtaMutation.isPending}
					>
						Avbryt
					</Button>
				)}
				<Button type="submit" disabled={createAtaMutation.isPending}>
					{createAtaMutation.isPending && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					Spara ÄTA
				</Button>
			</div>
		</form>
	);
}
