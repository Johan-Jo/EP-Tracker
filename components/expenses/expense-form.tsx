'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExpenseSchema, type CreateExpenseInput, type ExpenseWithRelations, EXPENSE_CATEGORIES } from '@/lib/schemas/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, Loader2, Camera, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Lazy load PhotoGalleryViewer - only loads when user opens gallery
const PhotoGalleryViewer = dynamic(() => import('@/components/ui/photo-gallery-viewer').then(m => ({ default: m.PhotoGalleryViewer })), {
	ssr: false,
});

interface ExpenseFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	initialData?: ExpenseWithRelations | null;
}

export function ExpenseForm({ orgId, onSuccess, onCancel, initialData }: ExpenseFormProps) {
	const isEditMode = !!initialData;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [photoPreviews, setPhotoPreviews] = useState<string[]>(initialData?.photo_urls || []);
	const [photoFiles, setPhotoFiles] = useState<File[]>([]);
	const [isGalleryOpen, setIsGalleryOpen] = useState(false);
	const [galleryStartIndex, setGalleryStartIndex] = useState(0);
	
	const supabase = createClient();
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<CreateExpenseInput>({
		resolver: zodResolver(createExpenseSchema) as any,
		defaultValues: initialData ? {
			category: initialData.category,
			description: initialData.description,
			amount_sek: initialData.amount_sek,
			vat: initialData.vat,
			project_id: initialData.project_id,
			notes: initialData.notes || '',
		} : {
			vat: true,
		},
	});

	// Update form when initialData changes
	useEffect(() => {
		if (initialData) {
			reset({
				category: initialData.category,
				description: initialData.description,
				amount_sek: initialData.amount_sek,
				vat: initialData.vat,
				project_id: initialData.project_id,
				notes: initialData.notes || '',
			});
			setPhotoPreviews(initialData.photo_urls || []);
			setPhotoFiles([]);
		}
	}, [initialData, reset]);

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		// Check total photo count
		if (photoPreviews.length + files.length > 10) {
			alert('Maximalt 10 foton tillåtna');
			return;
		}

		// Add new photos
		files.forEach((file) => {
			setPhotoFiles((prev) => [...prev, file]);
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotoPreviews((prev) => [...prev, reader.result as string]);
			};
			reader.readAsDataURL(file);
		});

		// Reset input
		e.target.value = '';
	};

	const removePhoto = (index: number) => {
		setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
		setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
	};

	const onSubmit = async (data: CreateExpenseInput) => {
		setIsSubmitting(true);

		try {
			const photoUrls: string[] = [];

			// Upload new photos if selected
			if (photoFiles.length > 0) {
				for (const file of photoFiles) {
					const fileExt = file.name.split('.').pop();
					const fileName = `${crypto.randomUUID()}.${fileExt}`;
					const filePath = `expenses/${fileName}`;

					const { error: uploadError} = await supabase.storage
						.from('receipts')
						.upload(filePath, file);

					if (uploadError) {
						throw new Error('Failed to upload receipt: ' + uploadError.message);
					}

					const { data: urlData } = supabase.storage
						.from('receipts')
						.getPublicUrl(filePath);

					photoUrls.push(urlData.publicUrl);
				}
			}

			// Combine existing photos (from photoPreviews that are URLs) with new uploads
			const existingPhotoUrls = photoPreviews.filter(p => p.startsWith('http'));
			const allPhotoUrls = [...existingPhotoUrls, ...photoUrls];

			// Determine HTTP method and URL
			const method = isEditMode ? 'PATCH' : 'POST';
			const url = isEditMode ? `/api/expenses/${initialData!.id}` : '/api/expenses';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...data,
					photo_urls: allPhotoUrls,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} expense`);
			}

			// Invalidate expenses query to refresh the list
			queryClient.invalidateQueries({ queryKey: ['expenses', orgId] });

			// Reset form
			reset();
			setPhotoFiles([]);
			setPhotoPreviews([]);
			onSuccess?.();
		} catch (error) {
			console.error(`Error ${isEditMode ? 'updating' : 'creating'} expense:`, error);
			alert(error instanceof Error ? error.message : `Misslyckades att ${isEditMode ? 'uppdatera' : 'skapa'} utlägg`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Receipt className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>{isEditMode ? 'Redigera utlägg' : 'Lägg till utlägg'}</CardTitle>
						<CardDescription>
							{isEditMode ? 'Uppdatera utlägg information' : 'Registrera kostnader och kvitton'}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{/* Project Selection */}
					<div className="space-y-2">
						<Label htmlFor="project_id">Projekt *</Label>
						{projectsLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Laddar projekt...
							</div>
						) : (
							<Select
								value={watch('project_id') || ''}
								onValueChange={(value) => setValue('project_id', value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj projekt" />
								</SelectTrigger>
								<SelectContent>
									{projects?.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
											{project.project_number && ` (${project.project_number})`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{errors.project_id && (
							<p className="text-sm text-destructive">{errors.project_id.message}</p>
						)}
					</div>

					{/* Category */}
					<div className="space-y-2">
						<Label htmlFor="category">Kategori (valfritt)</Label>
						<Select
							value={watch('category') || undefined}
							onValueChange={(value) => setValue('category', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj kategori" />
							</SelectTrigger>
							<SelectContent>
								{EXPENSE_CATEGORIES.map((cat) => (
									<SelectItem key={cat.value} value={cat.value}>
										{cat.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Beskrivning *</Label>
						<Input
							id="description"
							placeholder="t.ex. Verktyg, Bensin, Lunchmöte, etc."
							{...register('description')}
						/>
						{errors.description && (
							<p className="text-sm text-destructive">{errors.description.message}</p>
						)}
					</div>

					{/* Amount */}
					<div className="space-y-2">
						<Label htmlFor="amount_sek">Belopp (kr) *</Label>
						<Input
							id="amount_sek"
							type="number"
							step="0.01"
							placeholder="0.00"
							{...register('amount_sek', { valueAsNumber: true })}
						/>
						{errors.amount_sek && (
							<p className="text-sm text-destructive">{errors.amount_sek.message}</p>
						)}
					</div>

					{/* VAT Checkbox */}
					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="vat"
							className="w-4 h-4"
							{...register('vat')}
						/>
						<Label htmlFor="vat" className="font-normal cursor-pointer">
							Moms ingår i beloppet
						</Label>
					</div>

					{/* Receipt Photos Gallery */}
					<div className="space-y-2">
						<Label htmlFor="photo">
							Kvitton (valfritt) {photoPreviews.length > 0 && `- ${photoPreviews.length}/10`}
						</Label>
						
						{/* Photo Grid */}
						{photoPreviews.length > 0 && (
							<div className="grid grid-cols-3 gap-4 mb-2">
								{photoPreviews.map((preview, index) => (
									<div key={index} className="relative group bg-muted rounded-md p-2">
										<Image
											src={preview}
											alt={`Kvitto ${index + 1}`}
											width={400}
											height={256}
											className="w-full max-h-64 object-contain rounded-md cursor-pointer hover:opacity-80 transition-opacity"
											onClick={() => {
												setGalleryStartIndex(index);
												setIsGalleryOpen(true);
											}}
										/>
										<Button
											type="button"
											size="sm"
											variant="destructive"
											className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => removePhoto(index)}
										>
											<X className="w-3 h-3" />
										</Button>
									</div>
								))}
							</div>
						)}

						{/* Add Photo Button */}
						{photoPreviews.length < 10 && (
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => document.getElementById('receipt-input')?.click()}
								>
									<Camera className="w-4 h-4 mr-2" />
									{photoPreviews.length === 0 ? 'Fotografera kvitto' : 'Lägg till kvitto'}
								</Button>
								<input
									id="receipt-input"
									type="file"
									accept="image/*"
									capture="environment"
									multiple
									className="hidden"
									onChange={handlePhotoChange}
								/>
							</div>
						)}
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">Anteckningar (valfritt)</Label>
						<Textarea
							id="notes"
							placeholder="Fritext anteckningar..."
							rows={2}
							{...register('notes')}
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							{isEditMode ? 'Uppdatera utlägg' : 'Spara utlägg'}
						</Button>
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel}>
								Avbryt
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>

		{/* Photo Gallery Viewer */}
		<PhotoGalleryViewer
			photos={photoPreviews.filter(p => p.startsWith('http'))}
			isOpen={isGalleryOpen}
			onClose={() => setIsGalleryOpen(false)}
			initialIndex={galleryStartIndex}
		/>
	</>
	);
}

