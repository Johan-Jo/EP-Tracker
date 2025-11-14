'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	customerPayloadSchema,
	type Customer,
	type CustomerPayload,
	invoiceMethodEnum,
} from '@/lib/schemas/customer';
import {
	formatSwedishOrganizationNumber,
	formatSwedishPersonalIdentityNumber,
} from '@/lib/utils/swedish';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';

type CustomerFormProps = {
	customer?: Partial<Customer>;
	onSubmit: (values: CustomerPayload) => Promise<void>;
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

type CustomerFormInput = z.input<typeof customerPayloadSchema>;

const defaultValues: Partial<CustomerPayload> = {
	type: 'COMPANY',
	invoice_method: 'EMAIL',
	default_vat_rate: 25,
	f_tax: false,
	rot_enabled: false,
	terms: 30,
	invoice_address_country: 'Sverige',
	delivery_address_country: 'Sverige',
};

// Helper to convert empty strings to undefined for optional fields
const emptyToUndefined = (value: string | null | undefined): string | undefined => {
	if (value === null || value === undefined) return undefined;
	return value.trim() === '' ? undefined : value;
};

const toPayloadDefaults = (customer?: Partial<Customer>): CustomerPayload => {
	const merged = {
		...defaultValues,
		...customer,
	};

	return {
		type: merged.type ?? 'COMPANY',
		customer_no: emptyToUndefined(merged.customer_no),
		company_name: merged.company_name ?? '',
		org_no: merged.org_no ?? '',
		vat_no: emptyToUndefined(merged.vat_no),
		f_tax: merged.f_tax ?? false,
		first_name: merged.first_name ?? '',
		last_name: merged.last_name ?? '',
		personal_identity_no: merged.personal_identity_no ?? '',
		rot_enabled: merged.rot_enabled ?? false,
		property_designation: emptyToUndefined(merged.property_designation),
		housing_assoc_org_no: emptyToUndefined(merged.housing_assoc_org_no),
		apartment_no: emptyToUndefined(merged.apartment_no),
		ownership_share: merged.ownership_share ?? undefined,
		rot_consent_at: merged.rot_consent_at ? new Date(merged.rot_consent_at) : undefined,
		invoice_email: merged.invoice_email ?? '',
		invoice_method: merged.invoice_method ?? 'EMAIL',
		peppol_id: emptyToUndefined(merged.peppol_id),
		gln: emptyToUndefined(merged.gln),
		terms: merged.terms ?? 30,
		default_vat_rate: merged.default_vat_rate ?? 25,
		bankgiro: emptyToUndefined(merged.bankgiro),
		plusgiro: emptyToUndefined(merged.plusgiro),
		reference: emptyToUndefined(merged.reference),
		invoice_address_street: merged.invoice_address_street ?? '',
		invoice_address_zip: merged.invoice_address_zip ?? '',
		invoice_address_city: merged.invoice_address_city ?? '',
		invoice_address_country: merged.invoice_address_country ?? 'Sverige',
		phone_mobile: emptyToUndefined(merged.phone_mobile),
		notes: emptyToUndefined(merged.notes),
		is_archived: merged.is_archived ?? false,
	};
};

const ErrorText = ({ message }: { message?: string }) =>
	message ? (
		<p className="text-sm text-destructive mt-1" role="alert">
			{message}
		</p>
	) : null;

const generateCustomerNumberClient = () => {
	try {
		return `C-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
	} catch {
		return `C-${Math.random().toString(36).toUpperCase().slice(2, 10)}`;
	}
};

export function CustomerForm({
	customer,
	onSubmit,
	onCancel,
	submitLabel = 'Spara kund',
	isEditing = false,
}: CustomerFormProps) {
	const defaultPayload = useMemo(() => {
		const base = toPayloadDefaults(customer);
		return {
			...base,
			bankgiro: base.bankgiro ?? undefined,
			plusgiro: base.plusgiro ?? undefined,
		};
	}, [customer]);
	const [formError, setFormError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		control,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<CustomerFormInput, undefined, CustomerPayload>({
		resolver: zodResolver(customerPayloadSchema),
		defaultValues: defaultPayload as CustomerFormInput,
	});

	const type = watch('type');
	const rotEnabled = watch('rot_enabled') ?? false;
	const invoiceMethod = watch('invoice_method');
	const ownershipShare = watch('ownership_share');

	const customerTypeSelection = useMemo<'COMPANY' | 'PRIVATE_NO_ROT' | 'PRIVATE_ROT'>(() => {
		if (type === 'COMPANY') return 'COMPANY';
		return rotEnabled ? 'PRIVATE_ROT' : 'PRIVATE_NO_ROT';
	}, [type, rotEnabled]);

	const handleCustomerTypeChange = (value: 'COMPANY' | 'PRIVATE_NO_ROT' | 'PRIVATE_ROT') => {
		if (value === 'COMPANY') {
			setValue('type', 'COMPANY', { shouldDirty: true });
			setValue('rot_enabled', false, { shouldDirty: true });
			return;
		}

		setValue('type', 'PRIVATE', { shouldDirty: true });
		setValue('rot_enabled', value === 'PRIVATE_ROT', { shouldDirty: true });
	};

	const submitHandler = handleSubmit(
		async (values) => {
			setFormError(null);
			try {
				// Ensure required string fields are never undefined (convert to empty string)
				// This is needed because React Hook Form might return undefined for empty fields
				const transformedValues: CustomerPayload = {
					...values,
					// Required fields - ensure they are strings, not undefined
					company_name: values.company_name ?? '',
					org_no: values.org_no ?? '',
					first_name: values.first_name ?? '',
					last_name: values.last_name ?? '',
					personal_identity_no: values.personal_identity_no ?? '',
					invoice_email: values.invoice_email ?? '',
					invoice_address_street: values.invoice_address_street ?? '',
					invoice_address_zip: values.invoice_address_zip ?? '',
					invoice_address_city: values.invoice_address_city ?? '',
					invoice_address_country: values.invoice_address_country ?? 'Sverige',
					// Optional fields - convert empty strings to undefined
					customer_no: emptyToUndefined(values.customer_no),
					vat_no: emptyToUndefined(values.vat_no),
					peppol_id: emptyToUndefined(values.peppol_id),
					gln: emptyToUndefined(values.gln),
					bankgiro: emptyToUndefined(values.bankgiro),
					plusgiro: emptyToUndefined(values.plusgiro),
					reference: emptyToUndefined(values.reference),
					phone_mobile: emptyToUndefined(values.phone_mobile),
					notes: emptyToUndefined(values.notes),
					property_designation: emptyToUndefined(values.property_designation),
					housing_assoc_org_no: emptyToUndefined(values.housing_assoc_org_no),
					apartment_no: emptyToUndefined(values.apartment_no),
				};
				await onSubmit(transformedValues);
			} catch (error) {
				console.error('[CustomerForm] Submit error:', error);
				if (error instanceof Error) {
					// Check if it's a Zod validation error
					if (error.message.includes('expected string') || error.message.includes('Invalid input')) {
						setFormError('Kontrollera att alla obligatoriska fält är ifyllda korrekt.');
					} else {
						setFormError(error.message);
					}
				} else {
					setFormError('Kunde inte spara kund');
				}
			}
		},
		(submitErrors) => {
			const firstError = Object.values(submitErrors)[0];
			if (firstError && 'message' in firstError && typeof firstError.message === 'string') {
				setFormError(firstError.message);
			} else {
				setFormError('Kunde inte spara kund. Kontrollera fälten.');
			}
		}
	);

	useEffect(() => {
		if (!isEditing && !customer?.customer_no) {
			setValue('customer_no', generateCustomerNumberClient(), { shouldDirty: false });
		}
	}, [customer?.customer_no, isEditing, setValue]);

	return (
		<form onSubmit={submitHandler} className="space-y-6" noValidate>
			{formError ? (
				<p className="text-sm text-destructive text-right">{formError}</p>
			) : null}

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="customer_type">Kundtyp</Label>
							<Select
								value={customerTypeSelection}
								onValueChange={(value) =>
									handleCustomerTypeChange(value as 'COMPANY' | 'PRIVATE_NO_ROT' | 'PRIVATE_ROT')
								}
							>
								<SelectTrigger id="customer_type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="COMPANY">Företag</SelectItem>
									<SelectItem value="PRIVATE_NO_ROT">Privat (utan ROT)</SelectItem>
									<SelectItem value="PRIVATE_ROT">Privat (ROT)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="customer_no">Kundnummer</Label>
							<Input
								id="customer_no"
								placeholder="Ex. K-2025-0001"
								disabled={isEditing}
								{...register('customer_no')}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Lämnas tomt för att generera automatiskt.
							</p>
						</div>
					</div>

					{type === 'COMPANY' ? (
						<>
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
							<div className="grid gap-4 md:grid-cols-3">
								<div>
									<Label htmlFor="invoice_email">Fakturamejl *</Label>
									<Input
										id="invoice_email"
										type="email"
										placeholder="faktura@kund.se"
										{...register('invoice_email', { required: 'Fakturamejl krävs' })}
									/>
									<ErrorText message={errors.invoice_email?.message} />
								</div>
								<div>
									<Label htmlFor="invoice_method">Fakturakanal</Label>
									<Controller
										name="invoice_method"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={(value) => field.onChange(value)}
											>
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
							<div className="grid gap-4 md:grid-cols-3">
								<div>
									<Label htmlFor="bankgiro">Bankgiro</Label>
									<Input
										id="bankgiro"
										placeholder="Valfritt"
										value={(watch('bankgiro') as string | undefined) ?? ''}
										onChange={(e) =>
											setValue('bankgiro', e.target.value || undefined, {
												shouldDirty: true,
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="plusgiro">Plusgiro</Label>
									<Input
										id="plusgiro"
										placeholder="Valfritt"
										value={(watch('plusgiro') as string | undefined) ?? ''}
										onChange={(e) =>
											setValue('plusgiro', e.target.value || undefined, {
												shouldDirty: true,
											})
										}
									/>
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
													Markera om kunden har F-skattsedel.
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
						</>
					) : (
						<>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<Label htmlFor="first_name">Förnamn *</Label>
									<Input
										id="first_name"
										{...register('first_name', { required: 'Förnamn krävs för privatkund' })}
									/>
									<ErrorText message={errors.first_name?.message} />
								</div>
								<div>
									<Label htmlFor="last_name">Efternamn *</Label>
									<Input
										id="last_name"
										{...register('last_name', { required: 'Efternamn krävs för privatkund' })}
									/>
									<ErrorText message={errors.last_name?.message} />
								</div>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<Label htmlFor="personal_identity_no">
										Personnummer *
									</Label>
									<Input
										id="personal_identity_no"
										placeholder="ÅÅMMDDNNNN"
										{...register('personal_identity_no', {
											required: 'Personnummer krävs för privatkund',
										})}
									/>
									{watch('personal_identity_no') ? (
										<p className="text-xs text-muted-foreground mt-1">
											{formatSwedishPersonalIdentityNumber(
												String(watch('personal_identity_no'))
											) ?? 'Kontrollera att personnumret är korrekt'}
										</p>
									) : null}
									<ErrorText message={errors.personal_identity_no?.message} />
								</div>
								<div>
									<Label htmlFor="phone_mobile">Mobil</Label>
									<Input id="phone_mobile" {...register('phone_mobile')} />
								</div>
							</div>
							<Controller
								name="rot_enabled"
								control={control}
								render={({ field }) => (
									<div className="flex items-center space-x-3 rounded-md border p-3">
										<Switch
											id="rot_enabled"
											checked={field.value ?? false}
											onCheckedChange={(checked) => field.onChange(checked)}
										/>
										<div>
											<Label htmlFor="rot_enabled" className="font-medium">
												ROT-avdrag
											</Label>
											<p className="text-xs text-muted-foreground">
												Aktivera om kunden ska använda ROT-avdrag.
											</p>
										</div>
									</div>
								)}
							/>
							{rotEnabled && (
								<div className="grid gap-4 md:grid-cols-2">
									<div>
										<Label htmlFor="property_designation">
											Fastighetsbeteckning
										</Label>
										<Input
											id="property_designation"
											{...register('property_designation')}
										/>
									</div>
									<div>
										<Label htmlFor="housing_assoc_org_no">
											BRF organisationsnummer
										</Label>
										<Input
											id="housing_assoc_org_no"
											{...register('housing_assoc_org_no')}
										/>
									</div>
									<div>
										<Label htmlFor="apartment_no">Lägenhetsnummer</Label>
										<Input id="apartment_no" {...register('apartment_no')} />
									</div>
									<div>
										<Label htmlFor="ownership_share">
											Ägarandel (%)
										</Label>
										<Controller
											name="ownership_share"
											control={control}
											render={({ field }) => (
												<Input
													id="ownership_share"
													type="number"
													min={0}
													max={100}
													step="0.1"
													value={
														field.value === undefined ? '' : String(field.value)
													}
													onChange={(event) =>
														field.onChange(
															event.target.value === ''
																? undefined
																: Number.parseFloat(event.target.value)
														)
													}
												/>
											)}
										/>
										{ownershipShare !== undefined && ownershipShare !== null && (
											<p className="text-xs text-muted-foreground mt-1">
												{Number(ownershipShare).toFixed(1)} %
											</p>
										)}
										<ErrorText message={errors.ownership_share?.message} />
									</div>
									<div>
										<Label htmlFor="rot_consent_at">
											Medgivandedatum
										</Label>
										<Controller
											name="rot_consent_at"
											control={control}
											render={({ field }) => (
												<Input
													id="rot_consent_at"
													type="date"
													value={
														field.value && field.value instanceof Date
															? field.value.toISOString().slice(0, 10)
															: ''
													}
													onChange={(event) =>
														field.onChange(
															event.target.value
																? new Date(event.target.value)
																: undefined
														)
													}
												/>
											)}
										/>
										<ErrorText message={errors.rot_consent_at?.message} />
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="space-y-4">
						<div>
							<Label htmlFor="invoice_address_street">
								Fakturaadress
							</Label>
							<Controller
								name="invoice_address_street"
								control={control}
								rules={{
									validate: (value) => {
										if (type === 'PRIVATE' && (!value || (typeof value === 'string' && !value.trim()))) {
											return 'Fakturaadress krävs för privatkund';
										}
										return true;
									},
								}}
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
					</div>
					<div className="grid gap-4 md:grid-cols-4">
						<div>
							<Label htmlFor="invoice_address_zip">Postnummer</Label>
							<Input
								id="invoice_address_zip"
								{...register('invoice_address_zip')}
							/>
						</div>
						<div>
							<Label htmlFor="invoice_address_city">Stad</Label>
							<Input
								id="invoice_address_city"
								{...register('invoice_address_city')}
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="notes">Anteckningar</Label>
						<Textarea
							id="notes"
							rows={4}
							placeholder='Interna anteckningar (t.ex. "Godkänner endast Peppol")'
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


