'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	type Customer,
	customerContactSchema,
	type CustomerContactPayload,
} from '@/lib/schemas/customer';
import {
	useCreateCustomerContact,
	useCustomer,
	useCustomerContacts,
	useUpdateCustomer,
} from '@/lib/hooks/use-customers';
import { CustomerForm } from './customer-form';
import { CustomerMergeDialog } from './customer-merge-dialog';

type CustomerCardProps = {
	customerId: string;
	canMerge?: boolean;
};

const InfoRow = ({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Mail;
	label: string;
	value?: string | null;
}) =>
	value ? (
		<div className="flex items-center gap-3">
			<Icon className="h-4 w-4 text-muted-foreground" />
			<div>
				<p className="text-sm font-medium">{label}</p>
				<p className="text-sm text-muted-foreground">{value}</p>
			</div>
		</div>
	) : null;

export function CustomerCard({ customerId, canMerge = true }: CustomerCardProps) {
	const [editMode, setEditMode] = useState(false);
	const { data: customer, isLoading } = useCustomer(customerId);
	const {
		data: contacts,
		isLoading: isContactsLoading,
	} = useCustomerContacts(customerId);
	const updateCustomer = useUpdateCustomer(customerId);
	const createContact = useCreateCustomerContact(customerId);

	const defaultTab = customer?.type === 'COMPANY' ? 'overview' : 'overview';

	const contactForm = customerContactSchema
		.pick({
			name: true,
			role: true,
			email: true,
			phone: true,
			reference_code: true,
			is_primary: true,
		})
		.partial({ is_primary: true });

	const [newContact, setNewContact] = useState<
		z.infer<typeof contactForm>
	>({
		name: '',
		role: '',
		email: '',
		phone: '',
		reference_code: '',
		is_primary: false,
	});

	const handleContactSubmit = async () => {
		const parsed = contactForm.safeParse(newContact);
		if (!parsed.success) {
			return;
		}
		await createContact.mutateAsync({
			...parsed.data,
			is_primary: parsed.data.is_primary ?? false,
		} as CustomerContactPayload);
		setNewContact({
			name: '',
			role: '',
			email: '',
			phone: '',
			reference_code: '',
			is_primary: false,
		});
	};

	const overviewDetails = useMemo(() => {
		if (!customer) {
			return [];
		}

		const details: Array<{ label: string; value?: string }> = [
			{
				label: 'Kundnummer',
				value: customer.customer_no,
			},
			{
				label: customer.type === 'COMPANY' ? 'Organisationsnummer' : 'Personnummer',
				value:
					customer.type === 'COMPANY'
						? customer.org_no ?? undefined
						: customer.personal_identity_no ?? undefined,
			},
		];

		// Add contact person fields for companies
		if (customer.type === 'COMPANY') {
			if (customer.contact_person_name) {
				details.push({
					label: 'Kontaktperson',
					value: customer.contact_person_name,
				});
			}
			if (customer.contact_person_phone) {
				details.push({
					label: 'Kontaktpersonens telefon',
					value: customer.contact_person_phone,
				});
			}
		}

		details.push(
			{
				label: 'Fakturakanal',
				value:
					customer.invoice_method === 'EMAIL'
						? 'E-postfaktura'
						: customer.invoice_method === 'EFAKTURA'
							? 'E-faktura'
							: 'Postfaktura',
			},
			{
				label: 'Betalvillkor',
				value:
					customer.terms !== null && customer.terms !== undefined
						? `${customer.terms} dagar`
						: undefined,
			},
			{
				label: 'Standardmoms',
				value:
					customer.default_vat_rate !== undefined
						? `${customer.default_vat_rate} %`
						: undefined,
			}
		);

		return details;
	}, [customer]);

	if (isLoading || !customer) {
		return (
			<Card>
				<CardContent className="flex h-48 items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle className="text-xl">
						{customer.type === 'COMPANY'
							? customer.company_name
							: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()}
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						{customer.type === 'COMPANY' ? 'Företagskund' : 'Privatkund'}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<CustomerMergeDialog customer={customer} canMerge={canMerge} />
					<Button
						type="button"
						variant="outline"
						onClick={() => setEditMode((prev) => !prev)}
					>
						{editMode ? 'Avbryt redigering' : 'Redigera kund'}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue={defaultTab} className="space-y-4">
					<TabsList>
						<TabsTrigger value="overview">Översikt</TabsTrigger>
						<TabsTrigger value="contacts">Kontakter</TabsTrigger>
						<TabsTrigger value="billing">Fakturainställningar</TabsTrigger>
						<TabsTrigger value="history">Historik</TabsTrigger>
					</TabsList>

					<TabsContent value="overview">
						{editMode ? (
							<CustomerForm
								customer={customer}
								onSubmit={async (values) => {
									await updateCustomer.mutateAsync(values);
									setEditMode(false);
								}}
								onCancel={() => setEditMode(false)}
								submitLabel="Spara ändringar"
								isEditing
							/>
						) : (
							<div className="grid gap-6 lg:grid-cols-2">
								<div className="space-y-4">
									<InfoRow
										icon={Mail}
										label="Fakturamejl"
										value={customer.invoice_email}
									/>
									<InfoRow
										icon={Phone}
										label="Telefon"
										value={customer.phone_mobile}
									/>
									<div className="flex items-start gap-3">
										<MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium">Fakturaadress</p>
											<p className="text-sm text-muted-foreground">
												{customer.invoice_address_street ?? ''}
												{customer.invoice_address_zip
													? `, ${customer.invoice_address_zip}`
													: ''}
												{customer.invoice_address_city
													? ` ${customer.invoice_address_city}`
													: ''}
											</p>
										</div>
									</div>
									{customer.notes ? (
										<div>
											<p className="text-sm font-medium mb-1">Anteckningar</p>
											<p className="text-sm text-muted-foreground whitespace-pre-wrap">
												{customer.notes}
											</p>
										</div>
									) : null}
								</div>
								<div className="space-y-3">
									{overviewDetails.map((item) =>
										item.value ? (
											<div key={item.label}>
												<p className="text-xs uppercase text-muted-foreground">
													{item.label}
												</p>
												<p className="text-sm font-medium">{item.value}</p>
											</div>
										) : null
									)}
								</div>
							</div>
						)}
					</TabsContent>

					<TabsContent value="contacts">
						<div className="space-y-6">
							<div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
								<div>
									<Label htmlFor="contact-name">Namn *</Label>
									<Input
										id="contact-name"
										value={newContact.name}
										onChange={(event) =>
											setNewContact((prev) => ({ ...prev, name: event.target.value }))
										}
										placeholder="Kontaktperson"
									/>
								</div>
								<div>
									<Label htmlFor="contact-role">Roll</Label>
									<Input
										id="contact-role"
										value={newContact.role}
										onChange={(event) =>
											setNewContact((prev) => ({ ...prev, role: event.target.value }))
										}
										placeholder="Ex. Inköp"
									/>
								</div>
								<div>
									<Label htmlFor="contact-email">E-post</Label>
									<Input
										id="contact-email"
										type="email"
										value={newContact.email}
										onChange={(event) =>
											setNewContact((prev) => ({ ...prev, email: event.target.value }))
										}
										placeholder="kontakt@kund.se"
									/>
								</div>
								<div>
									<Label htmlFor="contact-phone">Telefon</Label>
									<Input
										id="contact-phone"
										value={newContact.phone}
										onChange={(event) =>
											setNewContact((prev) => ({ ...prev, phone: event.target.value }))
										}
										placeholder="+46..."
									/>
								</div>
								<div>
									<Label htmlFor="contact-reference">Referenskod</Label>
									<Input
										id="contact-reference"
										value={newContact.reference_code}
										onChange={(event) =>
											setNewContact((prev) => ({
												...prev,
												reference_code: event.target.value,
											}))
										}
										placeholder="Kundens ref"
									/>
								</div>
								<div className="flex items-center space-x-2 rounded-md border p-3">
									<input
										type="checkbox"
										checked={newContact.is_primary ?? false}
										onChange={(event) =>
											setNewContact((prev) => ({
												...prev,
												is_primary: event.target.checked,
											}))
										}
										id="contact-primary"
										className="h-4 w-4 rounded border border-border"
									/>
									<span className="text-sm">Primär kontakt</span>
								</div>
								<div className="md:col-span-2 flex justify-end">
									<Button
										type="button"
										disabled={createContact.isPending || isContactsLoading}
										onClick={handleContactSubmit}
									>
										{createContact.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Lägger till...
											</>
										) : (
											'Lägg till kontakt'
										)}
									</Button>
								</div>
							</div>

							<Separator />

							<div className="space-y-3">
								{isContactsLoading ? (
									<div className="flex h-24 items-center justify-center">
										<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
									</div>
								) : contacts && contacts.length > 0 ? (
									contacts.map((contact) => (
										<div
											key={contact.id}
											className="rounded-md border p-4 shadow-sm"
										>
											<div className="flex justify-between">
												<div>
													<p className="font-semibold">{contact.name}</p>
													<p className="text-sm text-muted-foreground">
														{contact.role}
													</p>
												</div>
												{contact.is_primary ? (
													<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
														Primär kontakt
													</span>
												) : null}
											</div>
											<div className="mt-3 text-sm text-muted-foreground space-y-1">
												{contact.email ? <p>{contact.email}</p> : null}
												{contact.phone ? <p>{contact.phone}</p> : null}
												{contact.reference_code ? (
													<p>Referens: {contact.reference_code}</p>
												) : null}
											</div>
										</div>
									))
								) : (
									<p className="text-sm text-muted-foreground">
										Inga kontakter är skapade ännu.
									</p>
								)}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="billing">
						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Fakturakanal</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<p>
										<strong>Metod:</strong>{' '}
										{customer.invoice_method === 'EMAIL'
											? 'E-post'
											: customer.invoice_method === 'EFAKTURA'
												? 'E-faktura (Peppol/GLN)'
												: 'Pappersfaktura'}
									</p>
									{customer.invoice_email ? (
										<p>
											<strong>E-post:</strong> {customer.invoice_email}
										</p>
									) : null}
									{customer.peppol_id ? (
										<p>
											<strong>Peppol-ID:</strong> {customer.peppol_id}
										</p>
									) : null}
									{customer.gln ? (
										<p>
											<strong>GLN:</strong> {customer.gln}
										</p>
									) : null}
									{customer.reference ? (
										<p>
											<strong>Referens:</strong> {customer.reference}
										</p>
									) : null}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-base">Betalningsinformation</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<p>
										<strong>Betalvillkor:</strong>{' '}
										{customer.terms !== null && customer.terms !== undefined
											? `${customer.terms} dagar`
											: 'Ej angivet'}
									</p>
									<p>
										<strong>Moms:</strong> {customer.default_vat_rate} %
									</p>
									{customer.bankgiro ? (
										<p>
											<strong>Bankgiro:</strong> {customer.bankgiro}
										</p>
									) : null}
									{customer.plusgiro ? (
										<p>
											<strong>Plusgiro:</strong> {customer.plusgiro}
										</p>
									) : null}
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="history">
						<div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
							<p>Auditlogg och historik kommer i senare iteration.</p>
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}


