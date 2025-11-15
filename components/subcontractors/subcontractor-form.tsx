'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	subcontractorPayloadSchema,
	type Subcontractor,
	type SubcontractorPayload,
	invoiceMethodEnum,
} from '@/lib/schemas/subcontractor';
import { formatSwedishOrganizationNumber } from '@/lib/utils/swedish';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';
import { generateSubcontractorNumberClient } from '@/lib/services/subcontractor-mapper';
import { useQuery } from '@tanstack/react-query';

type SubcontractorFormProps = {
	subcontractor?: Partial<Subcontractor>;
	onSubmit: (values: SubcontractorPayload) => Promise<void>;
	onCancel?: () => void;
	submitLabel?: string;
	isEditing?: boolean;
};

const invoiceMethodOptions = invoiceMethodEnum.options.map((value) => ({
	value,
	label:
		value === 'EMAIL'
			? 'E-postfaktura'
			: value === 'EFAKTURA'
				? 'E-faktura (Peppol/GLN)'
				: 'Pappersfaktura',
}));

const vatRateOptions = [0, 6, 12, 25].map((value) => ({
	value,
	label: `${value} %`,
}));

type SubcontractorFormInput = z.input<typeof subcontractorPayloadSchema>;
type SubcontractorFormOutput = z.infer<typeof subcontractorPayloadSchema>;

const defaultValues: Partial<SubcontractorPayload> = {
	invoice_method: 'EMAIL',
	default_vat_rate: 25,
	f_tax: false,
	terms: 30,
	invoice_address_country: 'Sverige',
	delivery_address_country: 'Sverige',
};

// Helper to convert empty strings to undefined for optional fields
const emptyToUndefined = (value: string | null | undefined): string | undefined => {
	if (value === null || value === undefined) return undefined;
	return value.trim() === '' ? undefined : value;
};

const toPayloadDefaults = (subcontractor?: Partial<Subcontractor>): SubcontractorPayload => {
	const merged = {
		...defaultValues,
		...subcontractor,
	};

	return {
		subcontractor_no: emptyToUndefined(merged.subcontractor_no),
		company_name: merged.company_name ?? '',
		org_no: merged.org_no ?? '',
		vat_no: emptyToUndefined(merged.vat_no),
		f_tax: merged.f_tax ?? false,
		contact_person_name: emptyToUndefined(merged.contact_person_name),
		contact_person_phone: emptyToUndefined(merged.contact_person_phone),
		email: emptyToUndefined(merged.email),
		phone_mobile: emptyToUndefined(merged.phone_mobile),
		phone_work: emptyToUndefined(merged.phone_work),
		invoice_email: merged.invoice_email ?? '',
		invoice_method: merged.invoice_method ?? 'EMAIL',
		peppol_id: emptyToUndefined(merged.peppol_id),
		gln: emptyToUndefined(merged.gln),
		terms: merged.terms ?? 30,
		default_vat_rate: (merged.default_vat_rate === 0 || merged.default_vat_rate === 6 || merged.default_vat_rate === 12 || merged.default_vat_rate === 25) 
			? merged.default_vat_rate 
			: 25,
		bankgiro: emptyToUndefined(merged.bankgiro),
		plusgiro: emptyToUndefined(merged.plusgiro),
		reference: emptyToUndefined(merged.reference),
		invoice_address_street: merged.invoice_address_street ?? '',
		invoice_address_zip: merged.invoice_address_zip ?? '',
		invoice_address_city: merged.invoice_address_city ?? '',
		invoice_address_country: merged.invoice_address_country ?? 'Sverige',
		delivery_address_street: emptyToUndefined(merged.delivery_address_street),
		delivery_address_zip: emptyToUndefined(merged.delivery_address_zip),
		delivery_address_city: emptyToUndefined(merged.delivery_address_city),
		delivery_address_country: merged.delivery_address_country ?? 'Sverige',
		notes: emptyToUndefined(merged.notes),
		hourly_rate_sek: merged.hourly_rate_sek ?? undefined,
		user_id: merged.user_id ?? '',
		is_archived: merged.is_archived ?? false,
	};
};

const ErrorText = ({ message }: { message?: string }) =>
	message ? (
		<p className="text-sm text-destructive mt-1" role="alert">
			{message}
		</p>
	) : null;

export function SubcontractorForm({
	subcontractor,
	onSubmit,
	onCancel,
	submitLabel = 'Spara underentreprenör',
	isEditing = false,
}: SubcontractorFormProps) {
	const defaultPayload = useMemo(() => toPayloadDefaults(subcontractor), [subcontractor]);
	const [formError, setFormError] = useState<string | null>(null);

	// Fetch organization members for user selection
	const { data: membersData } = useQuery<{ members: Array<{
		id: string;
		user_id: string;
		role: string;
		profiles: {
			id: string;
			full_name: string | null;
			email: string;
			phone: string | null;
		} | null;
	}> }>({
		queryKey: ['organization-members'],
		queryFn: async () => {
			const response = await fetch('/api/organizations/members');
			if (!response.ok) {
				throw new Error('Failed to fetch members');
			}
			return response.json();
		},
	});

	const {
		register,
		handleSubmit,
		control,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<SubcontractorFormInput, undefined, SubcontractorPayload>({
		resolver: zodResolver(subcontractorPayloadSchema),
		defaultValues: defaultPayload as SubcontractorFormInput,
	});

	const invoiceMethod = watch('invoice_method');

	const submitHandler = handleSubmit(
		async (values) => {
			setFormError(null);
			try {
				const transformedValues: SubcontractorPayload = {
					...values,
					// Required fields - ensure they are strings, not undefined
					company_name: values.company_name ?? '',
					org_no: values.org_no ?? '',
					invoice_email: values.invoice_email ?? '',
					// Optional fields - convert empty strings to undefined
					subcontractor_no: emptyToUndefined(values.subcontractor_no),
					vat_no: emptyToUndefined(values.vat_no),
					contact_person_name: emptyToUndefined(values.contact_person_name),
					contact_person_phone: emptyToUndefined(values.contact_person_phone),
					email: emptyToUndefined(values.email),
					phone_mobile: emptyToUndefined(values.phone_mobile),
					phone_work: emptyToUndefined(values.phone_work),
					peppol_id: emptyToUndefined(values.peppol_id),
					gln: emptyToUndefined(values.gln),
					bankgiro: emptyToUndefined(values.bankgiro),
					plusgiro: emptyToUndefined(values.plusgiro),
					reference: emptyToUndefined(values.reference),
					invoice_address_street: emptyToUndefined(values.invoice_address_street),
					invoice_address_zip: emptyToUndefined(values.invoice_address_zip),
					invoice_address_city: emptyToUndefined(values.invoice_address_city),
					invoice_address_country: values.invoice_address_country ?? 'Sverige',
					delivery_address_street: emptyToUndefined(values.delivery_address_street),
					delivery_address_zip: emptyToUndefined(values.delivery_address_zip),
					delivery_address_city: emptyToUndefined(values.delivery_address_city),
					delivery_address_country: values.delivery_address_country ?? 'Sverige',
					notes: emptyToUndefined(values.notes),
					hourly_rate_sek: values.hourly_rate_sek ?? undefined,
					user_id: values.user_id ?? '',
				};
				await onSubmit(transformedValues);
			} catch (error) {
				console.error('[SubcontractorForm] Submit error:', error);
				if (error instanceof Error) {
					if (
						error.message.includes('expected string') ||
						error.message.includes('Invalid input')
					) {
						setFormError('Kontrollera att alla obligatoriska fält är ifyllda korrekt.');
					} else {
						setFormError(error.message);
					}
				} else {
					setFormError('Kunde inte spara underentreprenör');
				}
			}
		},
		(submitErrors) => {
			const firstError = Object.values(submitErrors)[0];
			if (firstError && 'message' in firstError && typeof firstError.message === 'string') {
				setFormError(firstError.message);
			} else {
				setFormError('Kunde inte spara underentreprenör. Kontrollera fälten.');
			}
		}
	);

	useEffect(() => {
		if (!isEditing && !subcontractor?.subcontractor_no) {
			setValue('subcontractor_no', generateSubcontractorNumberClient(), {
				shouldDirty: false,
			});
		}
	}, [subcontractor?.subcontractor_no, isEditing, setValue]);

	return (
		<form onSubmit={submitHandler} className="space-y-6" noValidate>
			{formError ? (
				<p className="text-sm text-destructive text-right">{formError}</p>
			) : null}

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div>
						<Label htmlFor="subcontractor_no">Underentreprenörsnummer</Label>
						<Input
							id="subcontractor_no"
							placeholder="Ex. UE-2025-0001"
							disabled={isEditing}
							{...register('subcontractor_no')}
						/>
						<p className="text-xs text-muted-foreground mt-1">
							Lämnas tomt för att generera automatiskt.
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="company_name">Företagsnamn *</Label>
							<Input
								id="company_name"
								placeholder="Företagsnamn"
								{...register('company_name', { required: 'Företagsnamn krävs' })}
							/>
							<ErrorText message={errors.company_name?.message} />
						</div>
						<div>
							<Label htmlFor="org_no">Organisationsnummer *</Label>
							<Input
								id="org_no"
								placeholder="5560160680"
								{...register('org_no', { required: 'Organisationsnummer krävs' })}
							/>
							{watch('org_no') ? (
								<p className="text-xs text-muted-foreground mt-1">
									{formatSwedishOrganizationNumber(String(watch('org_no'))) ??
										'Kontrollera att numret är korrekt'}
								</p>
							) : null}
							<ErrorText message={errors.org_no?.message} />
						</div>
					</div>

					<div>
						<Label htmlFor="user_id">
							Koppla till användare <span className="text-destructive">*</span>
						</Label>
						<Controller
							name="user_id"
							control={control}
							rules={{ required: 'Användare krävs för underentreprenörer' }}
							render={({ field }) => (
								<Select
									value={field.value || ''}
									onValueChange={(value) => field.onChange(value)}
								>
									<SelectTrigger id="user_id">
										<SelectValue placeholder="Välj användare *" />
									</SelectTrigger>
									<SelectContent>
										{membersData?.members
											?.filter((member) => member.profiles)
											.map((member) => {
												const profile = member.profiles!;
												const displayName = profile.full_name || profile.email;
												return (
													<SelectItem key={member.user_id} value={member.user_id}>
														{displayName} {profile.email !== displayName ? `(${profile.email})` : ''}
													</SelectItem>
												);
											})}
									</SelectContent>
								</Select>
							)}
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Alla underentreprenörer måste ha ett EP-Tracker-konto.
						</p>
						<ErrorText message={errors.user_id?.message} />
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="contact_person_name">Kontaktperson</Label>
							<Input
								id="contact_person_name"
								placeholder="Namn på kontaktperson"
								{...register('contact_person_name')}
							/>
							<ErrorText message={errors.contact_person_name?.message} />
						</div>
						<div>
							<Label htmlFor="contact_person_phone">Kontaktpersonens telefon</Label>
							<Input
								id="contact_person_phone"
								placeholder="070-123 45 67"
								{...register('contact_person_phone')}
							/>
							<ErrorText message={errors.contact_person_phone?.message} />
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<Label htmlFor="email">E-post</Label>
							<Input
								id="email"
								type="email"
								placeholder="info@foretag.se"
								{...register('email')}
							/>
							<ErrorText message={errors.email?.message} />
						</div>
						<div>
							<Label htmlFor="phone_mobile">Mobiltelefon</Label>
							<Input
								id="phone_mobile"
								placeholder="070-123 45 67"
								{...register('phone_mobile')}
							/>
							<ErrorText message={errors.phone_mobile?.message} />
						</div>
						<div>
							<Label htmlFor="phone_work">Arbetstelefon</Label>
							<Input
								id="phone_work"
								placeholder="08-123 45 67"
								{...register('phone_work')}
							/>
							<ErrorText message={errors.phone_work?.message} />
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<Label htmlFor="invoice_email">
								Fakturamejl {watch('invoice_method') === 'EMAIL' ? '*' : ''}
							</Label>
							<Input
								id="invoice_email"
								type="email"
								placeholder="faktura@foretag.se"
								{...register('invoice_email', {
									required:
										watch('invoice_method') === 'EMAIL'
											? 'Fakturamejl krävs när fakturakanal är E-postfaktura'
											: false,
								})}
							/>
							<ErrorText message={errors.invoice_email?.message} />
						</div>
						<div>
							<Label htmlFor="invoice_method">Fakturakanal</Label>
							<Controller
								name="invoice_method"
								control={control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={(value) => field.onChange(value)}>
										<SelectTrigger id="invoice_method">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{invoiceMethodOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							<ErrorText message={errors.invoice_method?.message} />
						</div>
						<div>
							<Label htmlFor="terms">Betalvillkor (dagar)</Label>
							<Controller
								name="terms"
								control={control}
								render={({ field }) => (
									<Input
										id="terms"
										type="number"
										min={0}
										max={120}
										value={field.value !== undefined ? String(field.value) : ''}
										onChange={(event) =>
											field.onChange(
												event.target.value === ''
													? undefined
													: Number.parseInt(event.target.value, 10)
											)
										}
									/>
								)}
							/>
							<ErrorText message={errors.terms?.message} />
						</div>
					</div>

					{invoiceMethod === 'EFAKTURA' && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<Label htmlFor="peppol_id">Peppol-ID</Label>
								<Input id="peppol_id" {...register('peppol_id')} />
							</div>
							<div>
								<Label htmlFor="gln">GLN</Label>
								<Input id="gln" {...register('gln')} />
							</div>
						</div>
					)}

					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="hourly_rate_sek">Timpris (SEK)</Label>
							<Input
								id="hourly_rate_sek"
								type="number"
								step="0.01"
								placeholder="350.00"
								{...register('hourly_rate_sek', {
									valueAsNumber: true,
								})}
							/>
							<ErrorText message={errors.hourly_rate_sek?.message} />
						</div>
						<div>
							<Label htmlFor="default_vat_rate">Moms (%)</Label>
							<Controller
								name="default_vat_rate"
								control={control}
								render={({ field }) => (
									<Select
										value={String(field.value)}
										onValueChange={(value) => field.onChange(Number(value))}
									>
										<SelectTrigger id="default_vat_rate">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{vatRateOptions.map((option) => (
												<SelectItem
													key={option.value}
													value={String(option.value)}
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="f_tax"
							control={control}
							render={({ field }) => (
								<div className="flex items-center space-x-3 rounded-md border p-3">
									<Switch
										id="f_tax"
										checked={field.value ?? false}
										onCheckedChange={(checked) => field.onChange(checked)}
									/>
									<div>
										<Label htmlFor="f_tax" className="font-medium">
											F-skatt
										</Label>
										<p className="text-xs text-muted-foreground">
											Markera om underentreprenören har F-skattsedel.
										</p>
									</div>
								</div>
							)}
						/>
						<div>
							<Label htmlFor="reference">Referens/Kostnadsställe</Label>
							<Input
								id="reference"
								placeholder="Valfritt"
								value={(watch('reference') as string | undefined) ?? ''}
								onChange={(event) =>
									setValue('reference', event.target.value || undefined, {
										shouldDirty: true,
									})
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<h3 className="text-lg font-semibold">Fakturaadress</h3>
					<div>
						<Label htmlFor="invoice_address_street">Gatuadress</Label>
						<Controller
							name="invoice_address_street"
							control={control}
							render={({ field }) => (
								<AddressAutocomplete
									id="invoice_address_street"
									autoComplete="off"
									value={(field.value as string | undefined) ?? ''}
									onChange={(value) => field.onChange(value)}
									onSelect={(addr) => {
										field.onChange(addr.address_line1);
										setValue('invoice_address_zip', addr.postal_code ?? '', {
											shouldDirty: true,
										});
										setValue('invoice_address_city', addr.city ?? '', {
											shouldDirty: true,
										});
										setValue('invoice_address_country', addr.country ?? 'Sverige', {
											shouldDirty: true,
										});
									}}
									placeholder="Gata 1"
								/>
							)}
						/>
						<ErrorText message={errors.invoice_address_street?.message} />
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<Label htmlFor="invoice_address_zip">Postnummer</Label>
							<Input id="invoice_address_zip" {...register('invoice_address_zip')} />
						</div>
						<div>
							<Label htmlFor="invoice_address_city">Stad</Label>
							<Input id="invoice_address_city" {...register('invoice_address_city')} />
						</div>
						<div>
							<Label htmlFor="invoice_address_country">Land</Label>
							<Input
								id="invoice_address_country"
								{...register('invoice_address_country')}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<h3 className="text-lg font-semibold">Leveransadress (valfritt)</h3>
					<div>
						<Label htmlFor="delivery_address_street">Gatuadress</Label>
						<Controller
							name="delivery_address_street"
							control={control}
							render={({ field }) => (
								<AddressAutocomplete
									id="delivery_address_street"
									autoComplete="off"
									value={(field.value as string | undefined) ?? ''}
									onChange={(value) => field.onChange(value)}
									onSelect={(addr) => {
										field.onChange(addr.address_line1);
										setValue('delivery_address_zip', addr.postal_code ?? '', {
											shouldDirty: true,
										});
										setValue('delivery_address_city', addr.city ?? '', {
											shouldDirty: true,
										});
										setValue('delivery_address_country', addr.country ?? 'Sverige', {
											shouldDirty: true,
										});
									}}
									placeholder="Gata 1"
								/>
							)}
						/>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<Label htmlFor="delivery_address_zip">Postnummer</Label>
							<Input id="delivery_address_zip" {...register('delivery_address_zip')} />
						</div>
						<div>
							<Label htmlFor="delivery_address_city">Stad</Label>
							<Input id="delivery_address_city" {...register('delivery_address_city')} />
						</div>
						<div>
							<Label htmlFor="delivery_address_country">Land</Label>
							<Input
								id="delivery_address_country"
								{...register('delivery_address_country')}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div>
						<Label htmlFor="notes">Anteckningar</Label>
						<Textarea
							id="notes"
							rows={4}
							placeholder="Interna anteckningar om underentreprenören"
							value={(watch('notes') as string | undefined) ?? ''}
							onChange={(event) =>
								setValue('notes', event.target.value || undefined, {
									shouldDirty: true,
								})
							}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex items-center justify-end space-x-3">
				{onCancel ? (
					<Button type="button" variant="outline" onClick={onCancel}>
						Avbryt
					</Button>
				) : null}
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Sparar...' : submitLabel}
				</Button>
			</div>
		</form>
	);
}

