'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layers3, Merge, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
	useCustomerWithRelations,
	useCustomers,
	useMergeCustomer,
	type CustomerRelations,
} from '@/lib/hooks/use-customers';
import type { Customer, CustomerPayload } from '@/lib/schemas/customer';
import { CustomerSelect } from './customer-select';

type Choice = 'target' | 'duplicate';

type FieldConfig = {
	key: keyof CustomerPayload;
	label: string;
	description?: string;
	format?: (customer: Customer) => string | null;
	onDuplicateOverride?: (duplicate: Customer, target: Customer) => unknown;
};

const boolToText = (value: boolean | null | undefined) => (value ? 'Ja' : 'Nej');

const formatValue = (
	customer: Customer,
	key: keyof CustomerPayload,
	fallback?: (customer: Customer) => string | null
) => {
	if (fallback) return fallback(customer);
	const rawValue = (customer as any)[key];
	if (rawValue === null || rawValue === undefined || rawValue === '') {
		return '–';
	}
	if (typeof rawValue === 'boolean') {
		return boolToText(rawValue);
	}
	if (key === 'rot_consent_at') {
		return rawValue ? new Date(rawValue).toISOString().slice(0, 10) : '–';
	}
	return String(rawValue);
};

const BASE_FIELDS: FieldConfig[] = [
	{ key: 'invoice_email', label: 'Fakturamejl' },
	{ key: 'invoice_method', label: 'Fakturakanal' },
	{ key: 'peppol_id', label: 'Peppol-ID' },
	{ key: 'gln', label: 'GLN' },
	{ key: 'terms', label: 'Betalvillkor (dagar)' },
	{ key: 'default_vat_rate', label: 'Standardmoms (%)' },
	{ key: 'bankgiro', label: 'Bankgiro' },
	{ key: 'plusgiro', label: 'Plusgiro' },
	{ key: 'reference', label: 'Referens/Kostnadsställe' },
	{ key: 'phone_mobile', label: 'Telefon' },
];

const ADDRESS_FIELDS: FieldConfig[] = [
	{ key: 'invoice_address_street', label: 'Fakturaadress' },
	{ key: 'invoice_address_zip', label: 'Fakturapostnummer' },
	{ key: 'invoice_address_city', label: 'Fakturastad' },
	{ key: 'delivery_address_street', label: 'Leveransadress' },
	{ key: 'delivery_address_zip', label: 'Leveranspostnummer' },
	{ key: 'delivery_address_city', label: 'Leveransstad' },
];

const COMPANY_FIELDS: FieldConfig[] = [
	{ key: 'company_name', label: 'Företagsnamn' },
	{ key: 'org_no', label: 'Organisationsnummer' },
	{ key: 'vat_no', label: 'Momsregistreringsnummer' },
	{ key: 'f_tax', label: 'F-skatt', format: (customer) => boolToText(customer.f_tax) },
];

const PRIVATE_FIELDS: FieldConfig[] = [
	{ key: 'first_name', label: 'Förnamn' },
	{ key: 'last_name', label: 'Efternamn' },
	{ key: 'personal_identity_no', label: 'Personnummer' },
	{ key: 'rot_enabled', label: 'ROT-avdrag', format: (customer) => boolToText(customer.rot_enabled) },
	{ key: 'property_designation', label: 'Fastighetsbeteckning' },
	{ key: 'housing_assoc_org_no', label: 'BRF organisationsnummer' },
	{ key: 'apartment_no', label: 'Lägenhetsnummer' },
	{ key: 'ownership_share', label: 'Ägarandel (%)' },
	{
		key: 'rot_consent_at',
		label: 'ROT-medgivande',
		format: (customer) => (customer.rot_consent_at ? new Date(customer.rot_consent_at).toISOString().slice(0, 10) : '–'),
	},
];

const OTHER_FIELDS: FieldConfig[] = [
	{
		key: 'notes',
		label: 'Anteckningar',
		onDuplicateOverride: (duplicate, target) => {
			if (!duplicate.notes) return target.notes ?? '';
			if (!target.notes) return duplicate.notes;
			return `${target.notes}\n\n${duplicate.notes}`;
		},
	},
];

const buildFieldSections = (customer: Customer) => [
	{
		title: 'Grunduppgifter',
		fields: customer.type === 'COMPANY' ? COMPANY_FIELDS : PRIVATE_FIELDS,
	},
	{ title: 'Fakturering', fields: BASE_FIELDS },
	{ title: 'Adresser', fields: ADDRESS_FIELDS },
	{ title: 'Övrigt', fields: OTHER_FIELDS },
];

type CustomerMergeDialogProps = {
	customer: Customer;
	canMerge?: boolean;
};

export function CustomerMergeDialog({ customer, canMerge = true }: CustomerMergeDialogProps) {
	const [open, setOpen] = useState(false);
	const [duplicate, setDuplicate] = useState<Customer | null>(null);
	const [search, setSearch] = useState('');
	const [fieldChoices, setFieldChoices] = useState<Record<string, Choice>>({});

	const { data: duplicateData } = useCustomerWithRelations(duplicate?.id ?? null);
	const duplicateDetails = duplicateData?.customer ?? null;
	const duplicateRelations: CustomerRelations | null = duplicateData?.relations ?? null;
	const mergeMutation = useMergeCustomer(customer.id);

	useEffect(() => {
		if (!open) {
			setDuplicate(null);
			setSearch('');
			setFieldChoices({});
		}
	}, [open]);

	useEffect(() => {
		if (!duplicateDetails) return;
		const defaultChoices: Record<string, Choice> = {};
		const sections = buildFieldSections(customer);
		sections.forEach((section) => {
			section.fields.forEach((field) => {
				defaultChoices[field.key] = 'target';
			});
		});
		defaultChoices.type = 'target';
		setFieldChoices(defaultChoices);
	}, [customer, duplicateDetails]);

	const { data: duplicateSearch } = useCustomers(
		open
			? {
					query: search,
					page: 1,
					pageSize: 5,
					includeArchived: false,
				}
			: undefined
	);

	const candidateList = useMemo(() => {
		const items = duplicateSearch?.items ?? [];
		return items.filter((item) => item.id !== customer.id);
	}, [duplicateSearch, customer.id]);

	const handleChoiceChange = (key: string, choice: Choice) => {
		setFieldChoices((prev) => ({
			...prev,
			[key]: choice,
		}));
	};

	const buildOverrides = (): Partial<CustomerPayload> => {
		if (!duplicateDetails) return {};
		const overrides: Partial<CustomerPayload> = {};

		const sections = buildFieldSections(customer);
		sections.forEach((section) => {
			section.fields.forEach((field) => {
				const choice = fieldChoices[field.key] ?? 'target';
				if (choice !== 'duplicate') return;

				if (field.onDuplicateOverride) {
					const value = field.onDuplicateOverride(duplicateDetails, customer);
					overrides[field.key] = value as any;
					return;
				}

				const duplicateValue = (duplicateDetails as any)[field.key];
				overrides[field.key] = duplicateValue ?? null;
			});
		});

		if ((fieldChoices as any).type === 'duplicate') {
			overrides.type = duplicateDetails.type;
		}

		return overrides;
	};

	const handleMerge = async () => {
		if (!duplicateDetails) return;
		const overrides = buildOverrides();
		await mergeMutation.mutateAsync({
			duplicateId: duplicateDetails.id,
			overrides,
		});
		setOpen(false);
	};

	const renderChoiceButtons = (field: FieldConfig) => {
		if (!duplicateDetails) return null;
		const choice = fieldChoices[field.key] ?? 'target';
		const primaryValue = formatValue(customer, field.key, field.format);
		const duplicateValue = formatValue(duplicateDetails, field.key, field.format);
		const identical = primaryValue === duplicateValue;

		return (
			<div className="grid gap-3 md:grid-cols-2">
				<button
					type="button"
					onClick={() => handleChoiceChange(field.key, 'target')}
					className={cn(
						'rounded-md border p-3 text-left transition',
						choice === 'target'
							? 'border-orange-500 bg-orange-500/10 shadow-sm'
							: 'border-border hover:border-orange-400/60'
					)}
				>
					<p className="text-xs font-semibold uppercase text-muted-foreground">Behåll huvudkund</p>
					<p className="text-sm font-medium text-foreground">{primaryValue}</p>
				</button>
				<button
					type="button"
					onClick={() => handleChoiceChange(field.key, 'duplicate')}
					className={cn(
						'rounded-md border p-3 text-left transition',
						choice === 'duplicate'
							? 'border-green-500 bg-green-500/10 shadow-sm'
							: 'border-border hover:border-green-400/60'
					)}
					disabled={identical}
				>
					<p className="text-xs font-semibold uppercase text-muted-foreground">Använd dubblett</p>
					<p className="text-sm font-medium text-foreground">{duplicateValue}</p>
					{identical && <p className="text-xs text-muted-foreground mt-1">Samma värde</p>}
				</button>
			</div>
		);
	};

	if (!canMerge) {
		return null;
	}

	return (
		<>
			<Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
				<Merge className="h-4 w-4" />
				Slå ihop kund
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>Slå ihop kundposter</DialogTitle>
						<DialogDescription>
							Välj vilken dubblett som ska slås ihop med <strong>{customer.customer_no}</strong>. Alla projekt,
							kontakter och fakturaunderlag flyttas automatiskt till huvudkunden.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="text-sm font-semibold text-muted-foreground">Sök dubblett</Label>
							<div className="flex items-center gap-3">
								<Input
									placeholder="Sök på namn, organisationsnummer eller referens"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
								/>
								<CustomerSelect
									value={duplicate}
									onChange={(value) => {
										setDuplicate(value.id === customer.id ? null : value);
									}}
									allowCreate={false}
									placeholder="Välj dubblett"
								/>
							</div>
							{candidateList.length > 0 && !duplicate && (
								<div className="grid gap-2 rounded-md border p-3">
									{candidateList.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => setDuplicate(item)}
											className="flex items-center justify-between rounded border border-border/70 bg-background px-3 py-2 text-left hover:border-orange-400/70"
										>
											<div>
												<p className="text-sm font-medium">
													{item.type === 'COMPANY'
														? item.company_name
														: `${item.first_name ?? ''} ${item.last_name ?? ''}`}
												</p>
												<p className="text-xs text-muted-foreground">
													{item.customer_no} • {item.invoice_email ?? 'Ingen e-post'}
												</p>
											</div>
											<Layers3 className="h-4 w-4 text-muted-foreground" />
										</button>
									))}
								</div>
							)}
						</div>

						{duplicateDetails ? (
							<div className="space-y-6">
								<div className="rounded-md border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 space-y-2">
									<p className="font-semibold">Relationsdata</p>
									<p>Alla projekt, kontakter och fakturaunderlag som hör till dubbletten kommer att flyttas till huvudkunden.</p>
									{duplicateRelations ? (
										<div className="grid gap-2 text-xs text-blue-900/80 sm:grid-cols-3">
											<div className="rounded bg-white/50 px-2 py-1">
												<p className="font-semibold uppercase tracking-wide text-[11px] text-blue-900/70">Projekt</p>
												<p className="text-sm font-bold">{duplicateRelations.project_count}</p>
											</div>
											<div className="rounded bg-white/50 px-2 py-1">
												<p className="font-semibold uppercase tracking-wide text-[11px] text-blue-900/70">Kontakter</p>
												<p className="text-sm font-bold">{duplicateRelations.contact_count}</p>
											</div>
											<div className="rounded bg-white/50 px-2 py-1">
												<p className="font-semibold uppercase tracking-wide text-[11px] text-blue-900/70">Fakturaunderlag</p>
												<p className="text-sm font-bold">{duplicateRelations.invoice_basis_count}</p>
											</div>
										</div>
									) : null}
								</div>

								<div className="rounded-md border border-border/70 bg-background p-4">
									<Label className="text-sm font-semibold text-muted-foreground mb-3 block">Kundtyp</Label>
									<div className="grid gap-3 sm:grid-cols-2">
										<button
											type="button"
											onClick={() => handleChoiceChange('type', 'target')}
											className={cn(
												'rounded-md border p-3 text-left transition',
												(fieldChoices.type ?? 'target') === 'target'
													? 'border-orange-500 bg-orange-500/10 shadow-sm'
													: 'border-border hover:border-orange-400/60'
											)}
										>
											<p className="text-xs uppercase text-muted-foreground font-semibold">Behåll huvudkund</p>
											<p className="text-sm font-medium">{customer.type === 'COMPANY' ? 'Företag' : 'Privat/ROT'}</p>
										</button>
										<button
											type="button"
											onClick={() => handleChoiceChange('type', 'duplicate')}
											className={cn(
												'rounded-md border p-3 text-left transition',
												(fieldChoices.type ?? 'target') === 'duplicate'
													? 'border-green-500 bg-green-500/10 shadow-sm'
													: 'border-border hover:border-green-400/60'
											)}
											disabled={duplicateDetails.type === customer.type}
										>
											<p className="text-xs uppercase text-muted-foreground font-semibold">Använd dubblett</p>
											<p className="text-sm font-medium">{duplicateDetails.type === 'COMPANY' ? 'Företag' : 'Privat/ROT'}</p>
											{duplicateDetails.type === customer.type && (
												<p className="text-xs text-muted-foreground mt-1">Samma kundtyp</p>
											)}
										</button>
									</div>
								</div>

								{buildFieldSections(customer).map((section) => (
									<div key={section.title} className="space-y-4 rounded-md border border-border/70 bg-background p-4">
										<div>
											<p className="text-sm font-semibold text-muted-foreground uppercase">{section.title}</p>
											<Separator className="my-3" />
										</div>
										<div className="space-y-4">
											{section.fields.map((field) => (
												<div key={field.key} className="space-y-2">
													<div className="flex items-center justify-between">
														<p className="text-sm font-semibold text-foreground">{field.label}</p>
														{field.description ? (
															<span className="text-xs text-muted-foreground">{field.description}</span>
														) : null}
													</div>
													{renderChoiceButtons(field)}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
								<ShieldQuestion className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
								Välj en dubblett för att jämföra fält och välja vilka värden som ska behållas.
							</div>
						)}
					</div>

					<DialogFooter className="flex items-center justify-between">
						<div className="text-xs">
							{mergeMutation.isError ? (
								<span className="text-destructive">
									{mergeMutation.error instanceof Error
										? mergeMutation.error.message
										: 'Kunde inte slå ihop kunden'}
								</span>
							) : (
								<span className="text-muted-foreground">
									Tips: om du väljer dubblettens anteckningar kombineras båda anteckningarna automatiskt.
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Avbryt
							</Button>
							<Button
								onClick={handleMerge}
								disabled={!duplicateDetails || mergeMutation.isPending}
								className="bg-orange-500 text-white hover:bg-orange-600"
							>
								{mergeMutation.isPending ? 'Slår ihop...' : 'Slå ihop kunder'}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}


