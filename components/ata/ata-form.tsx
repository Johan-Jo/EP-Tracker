'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SignatureInput } from '@/components/shared/signature-input';
import toast from 'react-hot-toast';

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
	userRole?: 'admin' | 'foreman' | 'worker' | 'finance';
}

export function AtaForm({ projectId, onSuccess, onCancel, userRole }: AtaFormProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const [signature, setSignature] = useState<{ name: string; timestamp: string } | null>(null);
	const [submitAsPending, setSubmitAsPending] = useState(false);
	const isWorker = userRole === 'worker';
	const queryClient = useQueryClient();
	const supabase = createClient();
	const router = useRouter();

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
			// Determine status based on whether it's submitted for approval
			const status = submitAsPending ? 'pending_approval' : 'draft';
			
			// Create ÄTA entry with signature if provided
			const ataData = {
				...data,
				status,
				...(signature && {
					signed_by_name: signature.name,
					signed_at: signature.timestamp,
				}),
			};

			const response = await fetch('/api/ata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(ataData),
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
			const message = submitAsPending 
				? 'ÄTA skickad för godkännande!' 
				: 'ÄTA sparad som utkast!';
			toast.success(message);
			queryClient.invalidateQueries({ queryKey: ['ata'] });
			if (onSuccess) {
				onSuccess();
			} else {
				// If no onSuccess callback, redirect to ata list after a short delay
				setTimeout(() => {
					router.push('/dashboard/ata');
					router.refresh();
				}, 1000);
			}
		},
		onError: (error: Error) => {
			console.error('ÄTA save error:', error);
			toast.error(error.message || 'Kunde inte spara ÄTA');
		},
	});

	const uploadPhotos = async (ataId: string) => {
		for (let i = 0; i < photos.length; i++) {
			const photo = photos[i];
			const fileExt = photo.name.split('.').pop();
			const fileName = `${ataId}/${crypto.randomUUID()}.${fileExt}`;

			const { error: uploadError } = await supabase.storage
				.from('ata-photos')
				.upload(fileName, photo);

			if (uploadError) {
				console.error('Photo upload error:', uploadError);
				toast.error(`Kunde inte ladda upp foto ${i + 1}: ${uploadError.message}`);
				continue;
			}

			const { data: urlData } = supabase.storage
				.from('ata-photos')
				.getPublicUrl(fileName);

			// Save photo record
			const response = await fetch('/api/ata/photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ata_id: ataId,
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
			toast.error('Max 10 foton tillåtna');
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

	const selectedProjectId = watch('project_id');

	// Fetch projects
	const { data: projects } = useQuery({
		queryKey: ['projects'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.order('name');
			if (error) throw error;
			return data || [];
		},
	});

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				<div>
					<Label htmlFor="project_id">Projekt *</Label>
					<Select
						value={selectedProjectId || ''}
						onValueChange={(value) => setValue('project_id', value)}
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
									Ta foto eller välj fil ({photos.length}/10)
								</span>
							</div>
							<input
								type="file"
								accept="image/*"
								capture="environment"
								multiple
								className="hidden"
								onChange={handlePhotoChange}
							/>
						</label>
					)}
					</div>
				</div>
			</div>

			{/* Signature - optional for draft, required for pending_approval */}
			<div className="border-t pt-6">
				<SignatureInput
					onSign={setSignature}
					label={isWorker ? "Signatur (obligatoriskt)" : "Signatur (valfritt för utkast, obligatoriskt för att skicka för godkännande)"}
					existingSignature={signature}
				/>
				{submitAsPending && !signature && (
					<p className="text-sm text-destructive mt-2">
						Signatur krävs {isWorker ? '' : 'när du skickar för godkännande'}
					</p>
				)}
			</div>

			<div className="flex gap-3 justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						if (onCancel) {
							onCancel();
						} else {
							router.push('/dashboard/ata');
						}
					}}
					disabled={createAtaMutation.isPending}
				>
					Avbryt
				</Button>
				<div className="flex gap-3">
					{!isWorker && (
						<Button
							type="submit"
							variant="outline"
							disabled={createAtaMutation.isPending}
							onClick={() => setSubmitAsPending(false)}
						>
							{createAtaMutation.isPending && !submitAsPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Spara som utkast
						</Button>
					)}
					<Button
						type="submit"
						disabled={createAtaMutation.isPending || !signature}
						onClick={() => setSubmitAsPending(true)}
					>
						{createAtaMutation.isPending && submitAsPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{isWorker ? 'Skicka för godkännande' : 'Skicka för godkännande'}
					</Button>
				</div>
			</div>
		</form>
	);
}
