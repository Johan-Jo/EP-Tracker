'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { toast } from 'sonner';
import { billingTypeEnum, billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';

const ataFormSchema = z
	.object({
		project_id: z.string().uuid({ message: 'Välj ett projekt' }),
		title: z.string().min(1, 'Titel krävs'),
		description: z.string().optional().nullable(),
		qty: z.string().optional(),
		unit: z.string().optional().nullable(),
		unit_price_sek: z.string().optional(),
		ata_number: z.string().optional().nullable(),
		billing_type: z.union([billingTypeEnum, z.literal('')]),
		fixed_amount_sek: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.billing_type || data.billing_type === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Välj debitering',
				path: ['billing_type'],
			});
		}

		if (data.billing_type === 'FAST') {
			const parsedFixed = parseNumberString(data.fixed_amount_sek);
			if (!data.fixed_amount_sek || data.fixed_amount_sek.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Fast belopp krävs',
					path: ['fixed_amount_sek'],
				});
			} else if (parsedFixed === null || !Number.isFinite(parsedFixed) || parsedFixed <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Ange ett giltigt fast belopp större än 0',
					path: ['fixed_amount_sek'],
				});
			}
		}

		if (data.billing_type === 'LOPANDE') {
			if (data.qty && parseNumberString(data.qty) === null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Ange ett giltigt tal',
					path: ['qty'],
				});
			}
			if (data.unit_price_sek && parseNumberString(data.unit_price_sek) === null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Ange ett giltigt à-pris',
					path: ['unit_price_sek'],
				});
			}
			if (data.unit && data.unit.length > 10) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enhet får vara max 10 tecken',
					path: ['unit'],
				});
			}
		}
	});

type AtaFormValues = z.infer<typeof ataFormSchema>;

type CreateAtaPayload = {
	project_id: string;
	title: string;
	description: string | null;
	qty: number | null;
	unit: string | null;
	unit_price_sek: number | null;
	ata_number: string | null;
	billing_type: BillingType;
	fixed_amount_sek: number | null;
	status: 'draft' | 'pending_approval';
	signed_by_name?: string | null;
	signed_at?: string | null;
};

interface ProjectOption {
	id: string;
	name: string;
	project_number: string | null;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_ata_billing_type: BillingType;
}

const parseNumberString = (value?: string | null): number | null => {
	if (value === undefined || value === null) return null;
	const normalized = value.replace(',', '.').trim();
	if (normalized === '') return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

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
	} = useForm<AtaFormValues>({
		resolver: zodResolver(ataFormSchema),
		defaultValues: {
			project_id: projectId || '',
			title: '',
			description: '',
			qty: '',
			unit: '',
			unit_price_sek: '',
			ata_number: '',
			billing_type: '',
			fixed_amount_sek: '',
		},
	});

	const createAtaMutation = useMutation({
		mutationFn: async (payload: CreateAtaPayload) => {
			const ataData = {
				...payload,
				qty: payload.qty ?? null,
				unit: payload.unit ?? null,
				unit_price_sek: payload.unit_price_sek ?? null,
				fixed_amount_sek: payload.billing_type === 'FAST' ? payload.fixed_amount_sek ?? null : null,
				signed_by_name: payload.signed_by_name ?? null,
				signed_at: payload.signed_at ?? null,
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
		onSuccess: (_result, variables) => {
			const message =
				variables.status === 'pending_approval'
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

	const selectedProjectId = watch('project_id');
	const billingType = watch('billing_type');
	const qtyValue = watch('qty');
	const unitPriceValue = watch('unit_price_sek');
	const unitValue = watch('unit');
	const fixedAmountValue = watch('fixed_amount_sek');

	const qtyNumber = parseNumberString(qtyValue);
	const unitPriceNumber = parseNumberString(unitPriceValue);
	const fixedAmountNumber = parseNumberString(fixedAmountValue);

	const calculatedTotal =
		billingType === 'FAST'
			? fixedAmountNumber ?? null
			: qtyNumber !== null && unitPriceNumber !== null
			? qtyNumber * unitPriceNumber
			: null;

	const showTotalCard = calculatedTotal !== null && Number.isFinite(calculatedTotal) && calculatedTotal > 0;

	// Fetch projects
	const { data: projects } = useQuery<ProjectOption[]>({
		queryKey: ['projects'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number, billing_mode, default_ata_billing_type')
				.order('name');
			if (error) throw error;
			return data || [];
		},
	});

	const selectedProjectDetails = useMemo(
		() => projects?.find((project) => project.id === selectedProjectId) ?? null,
		[projects, selectedProjectId],
	);

	const effectiveBillingMode = selectedProjectDetails?.billing_mode ?? 'LOPANDE_ONLY';

	useEffect(() => {
		if (!selectedProjectId) {
			if (billingType !== '') {
				setValue('billing_type', '', { shouldDirty: true });
			}
			return;
		}

		const mode = selectedProjectDetails?.billing_mode ?? 'LOPANDE_ONLY';

		if (mode === 'FAST_ONLY' && billingType !== 'FAST') {
			setValue('billing_type', 'FAST', { shouldDirty: true });
		} else if (mode === 'LOPANDE_ONLY' && billingType !== 'LOPANDE') {
			setValue('billing_type', 'LOPANDE', { shouldDirty: true });
		} else if (mode === 'BOTH' && (!billingType || billingType === '')) {
			setValue('billing_type', selectedProjectDetails?.default_ata_billing_type ?? 'LOPANDE', {
				shouldDirty: false,
			});
		}
	}, [selectedProjectId, selectedProjectDetails, billingType, setValue]);

	useEffect(() => {
		if (billingType === 'FAST') {
			if (qtyValue) setValue('qty', '', { shouldDirty: true });
			if (unitPriceValue) setValue('unit_price_sek', '', { shouldDirty: true });
			if (unitValue) setValue('unit', '', { shouldDirty: true });
		} else if (billingType === 'LOPANDE') {
			if (fixedAmountValue) setValue('fixed_amount_sek', '', { shouldDirty: true });
		}
	}, [billingType, qtyValue, unitPriceValue, unitValue, fixedAmountValue, setValue]);

	const onSubmit = (data: AtaFormValues) => {
		const resolvedBillingType: BillingType =
			data.billing_type && data.billing_type !== ''
				? (data.billing_type as BillingType)
				: selectedProjectDetails?.default_ata_billing_type ?? 'LOPANDE';

		const payload: CreateAtaPayload = {
			project_id: data.project_id,
			title: data.title,
			description: data.description?.trim() ? data.description.trim() : null,
			qty: resolvedBillingType === 'FAST' ? null : parseNumberString(data.qty),
			unit: resolvedBillingType === 'FAST' ? null : data.unit?.trim() || null,
			unit_price_sek: resolvedBillingType === 'FAST' ? null : parseNumberString(data.unit_price_sek),
			ata_number: data.ata_number?.trim() || null,
			billing_type: resolvedBillingType,
			fixed_amount_sek: resolvedBillingType === 'FAST' ? parseNumberString(data.fixed_amount_sek) : null,
			status: submitAsPending ? 'pending_approval' : 'draft',
			signed_by_name: signature?.name ?? null,
			signed_at: signature?.timestamp ?? null,
		};

		createAtaMutation.mutate(payload);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				<div>
					<Label htmlFor="project_id">Projekt *</Label>
					<Select
						value={selectedProjectId || ''}
						onValueChange={(value) => setValue('project_id', value, { shouldDirty: true, shouldValidate: true })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Välj projekt" />
						</SelectTrigger>
						<SelectContent>
							{projects?.map((project) => (
								<SelectItem key={project.id} value={project.id}>
									{project.project_number ? `${project.project_number} - ` : ''}
									{project.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.project_id && (
						<p className="text-sm text-destructive mt-1">{errors.project_id.message}</p>
					)}
				</div>

				{selectedProjectId && (
					<div>
						<Label>Debitering *</Label>
						{effectiveBillingMode === 'BOTH' ? (
							<Select
								value={billingType || undefined}
								onValueChange={(value) =>
									setValue('billing_type', value as BillingType, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj debitering" />
								</SelectTrigger>
								<SelectContent>
									{billingTypeOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
								Debitering: {effectiveBillingMode === 'FAST_ONLY' ? 'Fast' : 'Löpande'}
							</div>
						)}
						{errors.billing_type && (
							<p className="text-sm text-destructive mt-1">{errors.billing_type.message}</p>
						)}
						{billingType === 'FAST' && (
							<p className="text-xs text-muted-foreground mt-1">
								Fast belopp kopplas till huvudprojektets fasta budget och visas som en fast rad på
								fakturaunderlaget.
							</p>
						)}
					</div>
				)}

				<div>
					<Label htmlFor="ata_number">ÄTA-nummer (valfritt)</Label>
					<Input id="ata_number" {...register('ata_number')} placeholder="t.ex. ÄTA-001" />
				</div>

				<div>
					<Label htmlFor="title">Titel *</Label>
					<Input id="title" {...register('title')} placeholder="t.ex. Extra eluttag i kök" />
					{errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
				</div>

				<div>
					<Label htmlFor="description">Beskrivning</Label>
					<Textarea id="description" {...register('description')} placeholder="Beskriv arbetet i detalj..." rows={4} />
				</div>

				{billingType === 'FAST' ? (
					<div>
						<Label htmlFor="fixed_amount_sek">Fast belopp (SEK) *</Label>
						<Input
							id="fixed_amount_sek"
							type="number"
							step="0.01"
							inputMode="decimal"
							{...register('fixed_amount_sek')}
							placeholder="0.00"
						/>
						{errors.fixed_amount_sek && (
							<p className="text-sm text-destructive mt-1">{errors.fixed_amount_sek.message}</p>
						)}
						<p className="text-xs text-muted-foreground mt-1">Ange totalbeloppet inklusive moms.</p>
					</div>
				) : (
					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label htmlFor="qty">Kvantitet</Label>
							<Input id="qty" type="number" step="0.01" {...register('qty')} placeholder="0" />
							{errors.qty && <p className="text-sm text-destructive mt-1">{errors.qty.message}</p>}
						</div>

						<div>
							<Label htmlFor="unit">Enhet</Label>
							<Input id="unit" {...register('unit')} placeholder="st, m², tim" />
						</div>

						<div>
							<Label htmlFor="unit_price_sek">À-pris (SEK)</Label>
							<Input
								id="unit_price_sek"
								type="number"
								step="0.01"
								inputMode="decimal"
								{...register('unit_price_sek')}
								placeholder="0.00"
							/>
							{errors.unit_price_sek && (
								<p className="text-sm text-destructive mt-1">{errors.unit_price_sek.message}</p>
							)}
						</div>
					</div>
				)}

				{showTotalCard && calculatedTotal !== null && (
					<Card className="bg-muted">
						<CardContent className="p-4">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Totalt:</span>
								<span className="text-lg font-bold">
									{calculatedTotal.toLocaleString('sv-SE', {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}{' '}
									SEK
								</span>
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
