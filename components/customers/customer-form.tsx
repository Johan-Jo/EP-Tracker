'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	customerPayloadSchema,
	type Customer,
	type CustomerPayload,
	invoiceMethodEnum,
	vatRateEnum,
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

const toPayloadDefaults = (customer?: Partial<Customer>): CustomerPayload => {
	const merged = {
		...defaultValues,
		...customer,
	};

	return {
		type: merged.type ?? 'COMPANY',
		customer_no: merged.customer_no,
		company_name: merged.company_name ?? '',
		org_no: merged.org_no ?? '',
		vat_no: merged.vat_no ?? '',
		f_tax: merged.f_tax ?? false,
		first_name: merged.first_name ?? '',
		last_name: merged.last_name ?? '',
		personal_identity_no: merged.personal_identity_no ?? '',
		rot_enabled: merged.rot_enabled ?? false,
		property_designation: merged.property_designation ?? '',
		housing_assoc_org_no: merged.housing_assoc_org_no ?? '',
		apartment_no: merged.apartment_no ?? '',
		ownership_share: merged.ownership_share ?? undefined,
		rot_consent_at: merged.rot_consent_at
			? new Date(merged.rot_consent_at)
			: undefined,
		invoice_email: merged.invoice_email ?? '',
		invoice_method: merged.invoice_method ?? 'EMAIL',
		peppol_id: merged.peppol_id ?? '',
		gln: merged.gln ?? '',
		terms: merged.terms ?? 30,
		default_vat_rate: merged.default_vat_rate ?? 25,
		bankgiro: merged.bankgiro ?? '',
		plusgiro: merged.plusgiro ?? '',
		reference: merged.reference ?? '',
		invoice_address_street: merged.invoice_address_street ?? '',
		invoice_address_zip: merged.invoice_address_zip ?? '',
		invoice_address_city: merged.invoice_address_city ?? '',
		invoice_address_country: merged.invoice_address_country ?? 'Sverige',
		delivery_address_street: merged.delivery_address_street ?? '',
		delivery_address_zip: merged.delivery_address_zip ?? '',
		delivery_address_city: merged.delivery_address_city ?? '',
		delivery_address_country: merged.delivery_address_country ?? 'Sverige',
		phone_mobile: merged.phone_mobile ?? '',
		notes: merged.notes ?? '',
		is_archived: merged.is_archived ?? false,
	};
};

const ErrorText = ({ message }: { message?: string }) =>
	message ? (
		<p className="text-sm text-destructive mt-1" role="alert">
			{message}
		</p>
	) : null;

export function CustomerForm({
	customer,
	onSubmit,
	onCancel,
	submitLabel = 'Spara kund',
	isEditing = false,
}: CustomerFormProps) {
	const defaultPayload = useMemo(
		() => toPayloadDefaults(customer),
		[customer]
	);
	const [formError, setFormError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		control,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<CustomerPayload>({
		resolver: zodResolver(customerPayloadSchema),
		defaultValues: defaultPayload,
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

	const submitHandler = handleSubmit(async (values) => {
		setFormError(null);
		try {
			await onSubmit(values);
		} catch (error) {
			console.error('Failed to submit customer form', error);
			setFormError(
				error instanceof Error ? error.message : 'Kunde inte spara kund'
			);
		}
	});

	return (
		<form onSubmit={submitHandler} className="space-y-6">
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
									<Input id="company_name" {...register('company_name')} />
									<ErrorText message={errors.company_name?.message} />
								</div>
								<div>
									<Label htmlFor="org_no">Organisationsnummer *</Label>
									<Input
										id="org_no"
										placeholder="5560160680"
										{...register('org_no')}
									/>
									{watch('org_no') && (
										<p className="text-xs text-muted-foreground mt-1">
											{formatSwedishOrganizationNumber(watch('org_no')) ??
												'Kontrollera att numret är korrekt'}
										</p>
									)}
									<ErrorText message={errors.org_no?.message} />
								</div>
							</div>
							<div className="grid gap-4 md:grid-cols-3">
								<div>
									<Label htmlFor="invoice_email">Fakturamejl</Label>
									<Input
										id="invoice_email"
										type="email"
										placeholder="faktura@kund.se"
										{...register('invoice_email')}
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
												value={field.value ?? ''}
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
									<Input id="bankgiro" {...register('bankgiro')} />
								</div>
								<div>
									<Label htmlFor="plusgiro">Plusgiro</Label>
									<Input id="plusgiro" {...register('plusgiro')} />
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
									<Input id="reference" {...register('reference')} />
								</div>
							</div>
						</>
					) : (
						<>
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<Label htmlFor="first_name">Förnamn *</Label>
									<Input id="first_name" {...register('first_name')} />
									<ErrorText message={errors.first_name?.message} />
								</div>
								<div>
									<Label htmlFor="last_name">Efternamn *</Label>
									<Input id="last_name" {...register('last_name')} />
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
										{...register('personal_identity_no')}
									/>
									{watch('personal_identity_no') && (
										<p className="text-xs text-muted-foreground mt-1">
											{formatSwedishPersonalIdentityNumber(
												watch('personal_identity_no')
											) ?? 'Kontrollera att personnumret är korrekt'}
										</p>
									)}
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
										{ownershipShare !== undefined && (
											<p className="text-xs text-muted-foreground mt-1">
												{ownershipShare.toFixed(1)} %
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
														field.value
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
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="invoice_address_street">
								Fakturaadress
							</Label>
							<Input
								id="invoice_address_street"
								placeholder="Gata 1"
								{...register('invoice_address_street')}
							/>
						</div>
						<div>
							<Label htmlFor="delivery_address_street">
								Leveransadress
							</Label>
							<Input
								id="delivery_address_street"
								placeholder="Gata 1"
								{...register('delivery_address_street')}
							/>
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
						<div>
							<Label htmlFor="delivery_address_zip">Leverans-Postnr</Label>
							<Input
								id="delivery_address_zip"
								{...register('delivery_address_zip')}
							/>
						</div>
						<div>
							<Label htmlFor="delivery_address_city">Leverans-Stad</Label>
							<Input
								id="delivery_address_city"
								{...register('delivery_address_city')}
							/>
						</div>
					</div>
					<div>
						<Label htmlFor="notes">Anteckningar</Label>
						<Textarea
							id="notes"
							rows={4}
							placeholder='Interna anteckningar (t.ex. "Godkänner endast Peppol")'
							{...register('notes')}
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
			{formError ? (
				<p className="text-sm text-destructive text-right">{formError}</p>
			) : null}
		</form>
	);
}


