'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	employeePayloadSchema,
	type Employee,
	type EmployeePayload,
	employmentTypeEnum,
} from '@/lib/schemas/employee';
import { formatSwedishPersonalIdentityNumber } from '@/lib/utils/swedish';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';
import { generateEmployeeNumberClient } from '@/lib/services/employee-mapper';
import { useQuery } from '@tanstack/react-query';

type EmployeeFormProps = {
	employee?: Partial<Employee>;
	onSubmit: (values: EmployeePayload) => Promise<void>;
	onCancel?: () => void;
	submitLabel?: string;
	isEditing?: boolean;
};

const employmentTypeOptions = employmentTypeEnum.options.map((value) => ({
	value,
	label:
		value === 'FULL_TIME'
			? 'Heltid'
			: value === 'PART_TIME'
				? 'Deltid'
				: value === 'CONTRACTOR'
					? 'Konsult'
					: 'Temporär',
}));

type EmployeeFormInput = z.input<typeof employeePayloadSchema>;

const defaultValues: Partial<EmployeePayload> = {
	employment_type: 'FULL_TIME',
	address_country: 'Sverige',
	is_archived: false,
};

const emptyToUndefined = (value: string | null | undefined): string | undefined => {
	if (value === null || value === undefined) return undefined;
	return value.trim() === '' ? undefined : value;
};

const toPayloadDefaults = (employee?: Partial<Employee>): EmployeePayload => {
	const merged = {
		...defaultValues,
		...employee,
	};

	return {
		employee_no: emptyToUndefined(merged.employee_no),
		first_name: merged.first_name ?? '',
		last_name: merged.last_name ?? '',
		personal_identity_no: emptyToUndefined(merged.personal_identity_no),
		email: emptyToUndefined(merged.email),
		phone_mobile: emptyToUndefined(merged.phone_mobile),
		phone_work: emptyToUndefined(merged.phone_work),
		employment_type: merged.employment_type ?? 'FULL_TIME',
		hourly_rate_sek: merged.hourly_rate_sek ?? undefined,
		employment_start_date: merged.employment_start_date
			? new Date(merged.employment_start_date)
			: undefined,
		employment_end_date: merged.employment_end_date
			? new Date(merged.employment_end_date)
			: undefined,
		address_street: emptyToUndefined(merged.address_street),
		address_zip: emptyToUndefined(merged.address_zip),
		address_city: emptyToUndefined(merged.address_city),
		address_country: merged.address_country ?? 'Sverige',
		notes: emptyToUndefined(merged.notes),
		user_id: merged.user_id ?? undefined,
		is_archived: merged.is_archived ?? false,
	};
};

const ErrorText = ({ message }: { message?: string }) =>
	message ? (
		<p className="text-sm text-destructive mt-1" role="alert">
			{message}
		</p>
	) : null;

type OrganizationMember = {
	id: string;
	user_id: string;
	role: string;
	profiles: {
		id: string;
		full_name: string | null;
		email: string;
		phone: string | null;
	} | null;
};

export function EmployeeForm({
	employee,
	onSubmit,
	onCancel,
	submitLabel = 'Spara personal',
	isEditing = false,
}: EmployeeFormProps) {
	const defaultPayload = useMemo(() => toPayloadDefaults(employee), [employee]);
	const [formError, setFormError] = useState<string | null>(null);

	// Fetch organization members for user selection
	const { data: membersData } = useQuery<{ members: OrganizationMember[] }>({
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
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<EmployeeFormInput, undefined, EmployeePayload>({
		resolver: zodResolver(employeePayloadSchema),
		defaultValues: defaultPayload as EmployeeFormInput,
	});

	const submitHandler = handleSubmit(
		async (values) => {
			setFormError(null);
			try {
				const transformedValues: EmployeePayload = {
					...values,
					first_name: values.first_name ?? '',
					last_name: values.last_name ?? '',
					employee_no: emptyToUndefined(values.employee_no),
					personal_identity_no: emptyToUndefined(values.personal_identity_no),
					email: emptyToUndefined(values.email),
					phone_mobile: emptyToUndefined(values.phone_mobile),
					phone_work: emptyToUndefined(values.phone_work),
					employment_start_date: values.employment_start_date instanceof Date && !isNaN(values.employment_start_date.getTime()) 
						? values.employment_start_date 
						: undefined,
					employment_end_date: values.employment_end_date instanceof Date && !isNaN(values.employment_end_date.getTime()) 
						? values.employment_end_date 
						: undefined,
					address_street: emptyToUndefined(values.address_street),
					address_zip: emptyToUndefined(values.address_zip),
					address_city: emptyToUndefined(values.address_city),
					address_country: values.address_country ?? 'Sverige',
					notes: emptyToUndefined(values.notes),
					user_id: values.user_id ? values.user_id : undefined,
				};

				await onSubmit(transformedValues);
			} catch (error) {
				setFormError(
					error instanceof Error ? error.message : 'Ett oväntat fel uppstod'
				);
			}
		},
		(errors) => {
			console.log('EmployeeForm validation errors', errors);
		}
	);

	// Auto-generate employee number if empty and not editing
	if (!isEditing && !watch('employee_no')) {
		const generated = generateEmployeeNumberClient();
		setValue('employee_no', generated, { shouldValidate: false });
	}

	return (
		<form onSubmit={submitHandler} className="space-y-6">
			{formError && (
				<div className="bg-destructive/10 text-destructive p-3 rounded-md">
					{formError}
				</div>
			)}

			{/* Personal Information */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Personuppgifter</h3>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="employee_no">Personalnummer</Label>
						<Input
							id="employee_no"
							placeholder="E-2025-0001"
							{...register('employee_no')}
						/>
						<ErrorText message={errors.employee_no?.message} />
					</div>
					<div>
						<Label htmlFor="personal_identity_no">Personnummer</Label>
						<Input
							id="personal_identity_no"
							placeholder="YYYYMMDD-XXXX"
							{...register('personal_identity_no', {
								onChange: (e) => {
									const value = e.target.value;
									if (value) {
										try {
											const formatted = formatSwedishPersonalIdentityNumber(value);
											if (formatted && formatted !== value) {
												setValue('personal_identity_no', formatted, {
													shouldValidate: true,
												});
											}
										} catch {
											// Ignore formatting errors
										}
									}
								},
							})}
						/>
						<ErrorText message={errors.personal_identity_no?.message} />
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="first_name">
							Förnamn <span className="text-destructive">*</span>
						</Label>
						<Input
							id="first_name"
							placeholder="Förnamn"
							{...register('first_name', { required: 'Förnamn krävs' })}
						/>
						<ErrorText message={errors.first_name?.message} />
					</div>
					<div>
						<Label htmlFor="last_name">
							Efternamn <span className="text-destructive">*</span>
						</Label>
						<Input
							id="last_name"
							placeholder="Efternamn"
							{...register('last_name', { required: 'Efternamn krävs' })}
						/>
						<ErrorText message={errors.last_name?.message} />
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="email">E-post</Label>
						<Input
							id="email"
							type="email"
							placeholder="namn@example.com"
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

			{/* Employment Details */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Anställningsuppgifter</h3>

				<div>
					<Label htmlFor="user_id">Koppla till användare (valfritt)</Label>
					<Select
						value={watch('user_id') || undefined}
						onValueChange={(value) =>
							setValue('user_id', value === '__none__' ? undefined : value, { shouldDirty: true })
						}
					>
						<SelectTrigger id="user_id">
							<SelectValue placeholder="Välj användare (valfritt)" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">Ingen användare</SelectItem>
							{membersData?.members
								?.filter((member) => member.profiles) // Only show members with profiles
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
					<p className="text-sm text-muted-foreground mt-1">
						Koppla denna personal till en användare i systemet för att länka tidsregistreringar och andra data.
					</p>
					<ErrorText message={errors.user_id?.message} />
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<Label htmlFor="employment_type">Anställningstyp</Label>
						<Select
							value={watch('employment_type')}
							onValueChange={(value) =>
								setValue('employment_type', value as any, { shouldDirty: true })
							}
						>
							<SelectTrigger id="employment_type">
								<SelectValue placeholder="Välj typ" />
							</SelectTrigger>
							<SelectContent>
								{employmentTypeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<ErrorText message={errors.employment_type?.message} />
					</div>
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
						<Label htmlFor="employment_start_date">Anställningsdatum (valfritt)</Label>
						<Input
							id="employment_start_date"
							type="date"
							{...register('employment_start_date', {
								setValueAs: (value) => {
									if (!value || value === '') return undefined;
									const date = new Date(value);
									return isNaN(date.getTime()) ? undefined : date;
								},
							})}
						/>
						<ErrorText message={errors.employment_start_date?.message} />
					</div>
				</div>

				<div>
					<Label htmlFor="employment_end_date">Slutdatum (valfritt)</Label>
					<Input
						id="employment_end_date"
						type="date"
						{...register('employment_end_date', {
							setValueAs: (value) => {
								if (!value || value === '') return undefined;
								const date = new Date(value);
								return isNaN(date.getTime()) ? undefined : date;
							},
						})}
					/>
					<ErrorText message={errors.employment_end_date?.message} />
				</div>
			</div>

			{/* Address */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Adress</h3>

				<div>
					<Label htmlFor="address_street">Gatuadress</Label>
					<AddressAutocomplete
						value={watch('address_street') || ''}
						onChange={(value) => {
							setValue('address_street', value, { shouldDirty: true });
						}}
						onSelect={(address) => {
							setValue('address_street', address.address_line1 || '', {
								shouldDirty: true,
							});
							setValue('address_zip', address.postal_code || '', { shouldDirty: true });
							setValue('address_city', address.city || '', { shouldDirty: true });
							setValue('address_country', address.country || 'Sverige', {
								shouldDirty: true,
							});
						}}
					/>
					<ErrorText message={errors.address_street?.message} />
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<Label htmlFor="address_zip">Postnummer</Label>
						<Input
							id="address_zip"
							placeholder="123 45"
							{...register('address_zip')}
						/>
						<ErrorText message={errors.address_zip?.message} />
					</div>
					<div>
						<Label htmlFor="address_city">Ort</Label>
						<Input
							id="address_city"
							placeholder="Stockholm"
							{...register('address_city')}
						/>
						<ErrorText message={errors.address_city?.message} />
					</div>
					<div>
						<Label htmlFor="address_country">Land</Label>
						<Input
							id="address_country"
							placeholder="Sverige"
							{...register('address_country')}
						/>
						<ErrorText message={errors.address_country?.message} />
					</div>
				</div>
			</div>

			{/* Notes */}
			<div>
				<Label htmlFor="notes">Anteckningar</Label>
				<Textarea
					id="notes"
					placeholder="Ytterligare information om personalen..."
					rows={4}
					{...register('notes')}
				/>
				<ErrorText message={errors.notes?.message} />
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-4">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Avbryt
					</Button>
				)}
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Sparar...' : submitLabel}
				</Button>
			</div>
		</form>
	);
}

