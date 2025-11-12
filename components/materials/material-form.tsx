'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMaterialSchema, type CreateMaterialInput, type MaterialWithRelations, MATERIAL_UNITS } from '@/lib/schemas/material';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Loader2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PhotoUploadButtons } from '@/components/shared/photo-upload-buttons';

const NO_PHASE_SELECT_VALUE = '__no_phase__';

// Lazy load PhotoGalleryViewer - only loads when user opens gallery
const PhotoGalleryViewer = dynamic(() => import('@/components/ui/photo-gallery-viewer').then(m => ({ default: m.PhotoGalleryViewer })), {
	ssr: false,
});

interface MaterialFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	initialData?: MaterialWithRelations | null;
}

export function MaterialForm({ orgId, onSuccess, onCancel, initialData }: MaterialFormProps) {
	const isEditMode = !!initialData;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedProject, setSelectedProject] = useState(initialData?.project_id || '');
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
	} = useForm<CreateMaterialInput>({
		resolver: zodResolver(createMaterialSchema) as any,
		defaultValues: initialData ? {
			description: initialData.description,
			qty: initialData.qty,
			unit: initialData.unit,
			unit_price_sek: initialData.unit_price_sek,
			project_id: initialData.project_id,
			phase_id: initialData.phase_id || undefined,
			notes: initialData.notes || '',
		} : undefined,
	});

	// Update form when initialData changes
	useEffect(() => {
		if (initialData) {
			reset({
				description: initialData.description,
				qty: initialData.qty,
				unit: initialData.unit,
				unit_price_sek: initialData.unit_price_sek,
				project_id: initialData.project_id,
				phase_id: initialData.phase_id || undefined,
				notes: initialData.notes || '',
			});
			setSelectedProject(initialData.project_id);
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

	// Fetch phases for selected project
	const { data: phases } = useQuery({
		queryKey: ['phases', selectedProject],
		queryFn: async () => {
			if (!selectedProject) return [];
			const { data, error } = await supabase
				.from('phases')
				.select('id, name')
				.eq('project_id', selectedProject)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProject,
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

	const onSubmit = async (data: CreateMaterialInput) => {
		setIsSubmitting(true);

		try {
			const photoUrls: string[] = [];

			// Upload new photos if selected
			if (photoFiles.length > 0) {
				for (const file of photoFiles) {
					const fileExt = file.name.split('.').pop();
					const fileName = `${crypto.randomUUID()}.${fileExt}`;
					const filePath = `materials/${fileName}`;

					const { error: uploadError } = await supabase.storage
						.from('receipts')
						.upload(filePath, file);

					if (uploadError) {
						throw new Error('Failed to upload photo: ' + uploadError.message);
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
			const url = isEditMode ? `/api/materials/${initialData!.id}` : '/api/materials';

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
				throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} material`);
			}

			// Invalidate materials query to refresh the list
			queryClient.invalidateQueries({ queryKey: ['materials', orgId] });

			// Reset form
			reset();
			setPhotoFiles([]);
			setPhotoPreviews([]);
			setSelectedProject('');
			onSuccess?.();
		} catch (error) {
			console.error(`Error ${isEditMode ? 'updating' : 'creating'} material:`, error);
			alert(error instanceof Error ? error.message : `Misslyckades att ${isEditMode ? 'uppdatera' : 'skapa'} material`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
		<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
			<CardHeader>
				<div className="flex items-center gap-3">
					<Package className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>{isEditMode ? 'Redigera material' : 'Lägg till material'}</CardTitle>
						<CardDescription>
							{isEditMode ? 'Uppdatera material information' : 'Registrera inköpt material'}
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
								name="project_id"
								value={watch('project_id') || ''}
								onValueChange={(value) => {
									setValue('project_id', value);
									setSelectedProject(value);
								}}
							>
								<SelectTrigger id="project_id">
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

					{/* Phase Selection */}
					{selectedProject && phases && phases.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="phase_id">Fas (valfritt)</Label>
							<Select
								name="phase_id"
								value={watch('phase_id') ?? NO_PHASE_SELECT_VALUE}
								onValueChange={(value) =>
									setValue('phase_id', value === NO_PHASE_SELECT_VALUE ? null : value)
								}
							>
								<SelectTrigger id="phase_id">
									<SelectValue placeholder="Välj fas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_PHASE_SELECT_VALUE}>Ingen fas</SelectItem>
									{phases?.map((phase) => (
										<SelectItem key={phase.id} value={phase.id}>
											{phase.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Beskrivning *</Label>
						<Input
							id="description"
							placeholder="t.ex. Trä 45x220, Spik, Färg, etc."
							{...register('description')}
						/>
						{errors.description && (
							<p className="text-sm text-destructive">{errors.description.message}</p>
						)}
					</div>

					{/* Quantity and Unit */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="qty">Antal *</Label>
							<Input
								id="qty"
								type="number"
								step="0.01"
								placeholder="0"
								{...register('qty', { valueAsNumber: true })}
							/>
							{errors.qty && (
								<p className="text-sm text-destructive">{errors.qty.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="unit">Enhet *</Label>
							<Select
								name="unit"
								value={watch('unit') || ''}
								onValueChange={(value) => setValue('unit', value)}
							>
								<SelectTrigger id="unit">
									<SelectValue placeholder="Välj enhet" />
								</SelectTrigger>
								<SelectContent>
									{MATERIAL_UNITS.map((unit) => (
										<SelectItem key={unit.value} value={unit.value}>
											{unit.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.unit && (
								<p className="text-sm text-destructive">{errors.unit.message}</p>
							)}
						</div>
					</div>

					{/* Unit Price */}
					<div className="space-y-2">
						<Label htmlFor="unit_price_sek">Enhetspris (kr) *</Label>
						<Input
							id="unit_price_sek"
							type="number"
							step="0.01"
							placeholder="0.00"
							{...register('unit_price_sek', { valueAsNumber: true })}
						/>
						{errors.unit_price_sek && (
							<p className="text-sm text-destructive">{errors.unit_price_sek.message}</p>
						)}
					</div>

					{/* Photo Gallery */}
					<div className="space-y-2">
						<Label htmlFor="photo">
							Foton (valfritt) {photoPreviews.length > 0 && `- ${photoPreviews.length}/10`}
						</Label>
						
						{/* Photo Grid */}
						{photoPreviews.length > 0 && (
							<div className="grid grid-cols-3 gap-4 mb-2">
								{photoPreviews.map((preview, index) => (
									<div key={index} className="relative group bg-muted rounded-md p-2">
										<Image
											src={preview}
											alt={`Preview ${index + 1}`}
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
							<PhotoUploadButtons
								onFileChange={handlePhotoChange}
								onCameraChange={handlePhotoChange}
								fileLabel="Välj fil"
								cameraLabel={photoPreviews.length === 0 ? 'Ta foto' : 'Lägg till foto'}
								fileButtonVariant="outline"
								cameraButtonVariant="default"
								fileButtonClassName="flex-1"
								cameraButtonClassName="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
							/>
						)}
						<p className="text-xs text-muted-foreground">
							{photoPreviews.length} av 10 bilder uppladdade
						</p>
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
							{isEditMode ? 'Uppdatera material' : 'Spara material'}
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

