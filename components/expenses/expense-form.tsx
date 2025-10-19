'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExpenseSchema, type CreateExpenseInput, EXPENSE_CATEGORIES } from '@/lib/schemas/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, Loader2, Camera, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface ExpenseFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	defaultValues?: Partial<CreateExpenseInput>;
}

export function ExpenseForm({ orgId, onSuccess, onCancel, defaultValues }: ExpenseFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	
	const supabase = createClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<CreateExpenseInput>({
		resolver: zodResolver(createExpenseSchema),
		defaultValues: {
			vat: true,
			...defaultValues,
		},
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

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setPhotoFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const clearPhoto = () => {
		setPhotoFile(null);
		setPhotoPreview(null);
		setValue('photo_url', null);
	};

	const onSubmit = async (data: CreateExpenseInput) => {
		setIsSubmitting(true);

		try {
			let photoUrl = data.photo_url;

			// Upload photo if selected
			if (photoFile) {
				const fileExt = photoFile.name.split('.').pop();
				const fileName = `${crypto.randomUUID()}.${fileExt}`;
				const filePath = `expenses/${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('receipts')
					.upload(filePath, photoFile);

				if (uploadError) {
					throw new Error('Failed to upload receipt: ' + uploadError.message);
				}

				const { data: urlData } = supabase.storage
					.from('receipts')
					.getPublicUrl(filePath);

				photoUrl = urlData.publicUrl;
			}

			const response = await fetch('/api/expenses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...data,
					photo_url: photoUrl,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create expense');
			}

			onSuccess?.();
		} catch (error) {
			console.error('Error creating expense:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att skapa utlägg');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Receipt className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>Lägg till utlägg</CardTitle>
						<CardDescription>Registrera kostnader och kvitton</CardDescription>
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
							value={watch('category') || ''}
							onValueChange={(value) => setValue('category', value || null)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj kategori" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Ingen kategori</SelectItem>
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

					{/* Receipt Photo */}
					<div className="space-y-2">
						<Label htmlFor="photo">Kvitto (valfritt)</Label>
						{photoPreview ? (
							<div className="relative">
								<img
									src={photoPreview}
									alt="Kvitto"
									className="w-full h-48 object-cover rounded-md"
								/>
								<Button
									type="button"
									size="sm"
									variant="destructive"
									className="absolute top-2 right-2"
									onClick={clearPhoto}
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						) : (
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => document.getElementById('receipt-input')?.click()}
								>
									<Camera className="w-4 h-4 mr-2" />
									Fotografera kvitto
								</Button>
								<input
									id="receipt-input"
									type="file"
									accept="image/*"
									capture="environment"
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
							Spara utlägg
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

