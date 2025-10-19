'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMaterialSchema, type CreateMaterialInput, MATERIAL_UNITS } from '@/lib/schemas/material';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Loader2, Camera, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface MaterialFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	defaultValues?: Partial<CreateMaterialInput>;
}

export function MaterialForm({ orgId, onSuccess, onCancel, defaultValues }: MaterialFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedProject, setSelectedProject] = useState(defaultValues?.project_id || '');
	const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
	const [photoFiles, setPhotoFiles] = useState<File[]>([]);
	
	const supabase = createClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<CreateMaterialInput>({
		resolver: zodResolver(createMaterialSchema) as any,
		defaultValues,
	});

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

			// Upload all photos if selected
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

			const response = await fetch('/api/materials', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...data,
					photo_urls: photoUrls,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create material');
			}

			// Reset form
			setPhotoFiles([]);
			setPhotoPreviews([]);
			onSuccess?.();
		} catch (error) {
			console.error('Error creating material:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att skapa material');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Package className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>Lägg till material</CardTitle>
						<CardDescription>Registrera inköpt material</CardDescription>
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
								onValueChange={(value) => {
									setValue('project_id', value);
									setSelectedProject(value);
								}}
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

					{/* Phase Selection */}
					{selectedProject && phases && phases.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="phase_id">Fas (valfritt)</Label>
							<Select
								value={watch('phase_id') || ''}
								onValueChange={(value) => setValue('phase_id', value || null)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj fas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Ingen fas</SelectItem>
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
								value={watch('unit') || ''}
								onValueChange={(value) => setValue('unit', value)}
							>
								<SelectTrigger>
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
							<div className="grid grid-cols-3 gap-2 mb-2">
								{photoPreviews.map((preview, index) => (
									<div key={index} className="relative group">
										<img
											src={preview}
											alt={`Preview ${index + 1}`}
											className="w-full h-24 object-cover rounded-md border border-border"
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
									onClick={() => document.getElementById('photo-input')?.click()}
								>
									<Camera className="w-4 h-4 mr-2" />
									{photoPreviews.length === 0 ? 'Ta foto / Välj fil' : 'Lägg till foto'}
								</Button>
								<input
									id="photo-input"
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
							Spara material
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
	);
}

