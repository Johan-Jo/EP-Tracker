'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMileageSchema, type CreateMileageInput, MILEAGE_RATES } from '@/lib/schemas/mileage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface MileageFormProps {
	orgId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	defaultValues?: Partial<CreateMileageInput>;
}

export function MileageForm({ orgId, onSuccess, onCancel, defaultValues }: MileageFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const supabase = createClient();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<CreateMileageInput>({
		resolver: zodResolver(createMileageSchema),
		defaultValues: {
			date: new Date().toISOString().slice(0, 10),
			rate_per_km_sek: MILEAGE_RATES.standard_per_km,
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

	const km = watch('km') || 0;
	const ratePerKm = watch('rate_per_km_sek') || 0;
	const totalAmount = km * ratePerKm;
	const mil = km / 10;

	const onSubmit = async (data: CreateMileageInput) => {
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/mileage', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create mileage');
			}

			onSuccess?.();
		} catch (error) {
			console.error('Error creating mileage:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att skapa milersättning');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Car className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>Lägg till milersättning</CardTitle>
						<CardDescription>Registrera körda kilometer</CardDescription>
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
								onValueChange={(value) => setValue('project_id', value)}
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

					{/* Date */}
					<div className="space-y-2">
						<Label htmlFor="date">Datum *</Label>
						<Input
							id="date"
							type="date"
							{...register('date')}
						/>
						{errors.date && (
							<p className="text-sm text-destructive">{errors.date.message}</p>
						)}
					</div>

					{/* Kilometers */}
					<div className="space-y-2">
						<Label htmlFor="km">Kilometer *</Label>
						<Input
							id="km"
							type="number"
							step="0.1"
							placeholder="0"
							{...register('km', { valueAsNumber: true })}
						/>
						{errors.km && (
							<p className="text-sm text-destructive">{errors.km.message}</p>
						)}
						{km > 0 && (
							<p className="text-sm text-muted-foreground">
								= {mil.toFixed(1)} mil (svenska mil)
							</p>
						)}
					</div>

					{/* Rate per km */}
					<div className="space-y-2">
						<Label htmlFor="rate_per_km_sek">Ersättning per km (kr) *</Label>
						<div className="flex gap-2">
							<Input
								id="rate_per_km_sek"
								type="number"
								step="0.01"
								placeholder="1.85"
								{...register('rate_per_km_sek', { valueAsNumber: true })}
								className="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={() => setValue('rate_per_km_sek', MILEAGE_RATES.standard_per_km)}
							>
								Standard (1.85 kr/km)
							</Button>
						</div>
						{errors.rate_per_km_sek && (
							<p className="text-sm text-destructive">{errors.rate_per_km_sek.message}</p>
						)}
						<p className="text-sm text-muted-foreground">
							Skatteverkets schablon 2025: 18.50 kr/mil = 1.85 kr/km
						</p>
					</div>

					{/* Total Amount Display */}
					{km > 0 && ratePerKm > 0 && (
						<div className="p-4 bg-muted rounded-md">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Totalt belopp:</span>
								<span className="text-lg font-bold text-primary">
									{totalAmount.toFixed(2)} kr
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{km} km × {ratePerKm.toFixed(2)} kr/km
							</p>
						</div>
					)}

					{/* From/To Locations */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="from_location">Från (valfritt)</Label>
							<Input
								id="from_location"
								placeholder="t.ex. Kontoret"
								{...register('from_location')}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="to_location">Till (valfritt)</Label>
							<Input
								id="to_location"
								placeholder="t.ex. Byggarbetsplatsen"
								{...register('to_location')}
							/>
						</div>
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
							Spara milersättning
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

