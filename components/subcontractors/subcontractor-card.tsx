'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { type Subcontractor } from '@/lib/schemas/subcontractor';
import {
	useSubcontractor,
	useUpdateSubcontractor,
} from '@/lib/hooks/use-subcontractors';
import { SubcontractorForm } from './subcontractor-form';
import { formatSwedishOrganizationNumber } from '@/lib/utils/swedish';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

type SubcontractorCardProps = {
	subcontractorId: string;
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

export function SubcontractorCard({ subcontractorId }: SubcontractorCardProps) {
	const [editMode, setEditMode] = useState(false);
	const { data: subcontractor, isLoading } = useSubcontractor(subcontractorId);
	const updateSubcontractor = useUpdateSubcontractor();

	// Fetch linked user profile if user_id exists
	const { data: linkedUser } = useQuery<OrganizationMember | null>({
		queryKey: ['organization-member', subcontractor?.user_id],
		queryFn: async () => {
			if (!subcontractor?.user_id) return null;
			const response = await fetch('/api/organizations/members');
			if (!response.ok) return null;
			const data = await response.json();
			return data.members?.find((m: OrganizationMember) => m.user_id === subcontractor.user_id) || null;
		},
		enabled: !!subcontractor?.user_id,
	});

	const overviewDetails = useMemo(() => {
		if (!subcontractor) {
			return [];
		}

		const details: Array<{ label: string; value?: string; link?: string }> = [
			{
				label: 'Underentreprenörsnummer',
				value: subcontractor.subcontractor_no,
			},
			{
				label: 'Organisationsnummer',
				value: subcontractor.org_no
					? formatSwedishOrganizationNumber(subcontractor.org_no) ?? undefined
					: undefined,
			},
		];

		if (subcontractor.user_id && linkedUser?.profiles) {
			const profile = linkedUser.profiles;
			const displayName = profile.full_name || profile.email;
			details.push({
				label: 'Kopplad användare',
				value: `${displayName} (${profile.email})`,
				link: `/dashboard/settings/users`,
			});
		}

		if (subcontractor.contact_person_name) {
			details.push({
				label: 'Kontaktperson',
				value: subcontractor.contact_person_name,
			});
		}
		if (subcontractor.contact_person_phone) {
			details.push({
				label: 'Kontaktpersonens telefon',
				value: subcontractor.contact_person_phone,
			});
		}

		details.push(
			{
				label: 'Fakturakanal',
				value:
					subcontractor.invoice_method === 'EMAIL'
						? 'E-postfaktura'
						: subcontractor.invoice_method === 'EFAKTURA'
							? 'E-faktura'
							: 'Pappersfaktura',
			},
			{
				label: 'Moms',
				value: `${subcontractor.default_vat_rate} %`,
			},
			{
				label: 'F-skatt',
				value: subcontractor.f_tax ? 'Ja' : 'Nej',
			}
		);

		if (subcontractor.terms) {
			details.push({
				label: 'Betalvillkor',
				value: `${subcontractor.terms} dagar`,
			});
		}

		return details;
	}, [subcontractor, linkedUser]);

	const handleUpdate = async (payload: Parameters<typeof updateSubcontractor.mutateAsync>[0]['payload']) => {
		await updateSubcontractor.mutateAsync({
			id: subcontractorId,
			payload,
		});
		setEditMode(false);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center p-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	if (!subcontractor) {
		return (
			<Card className="p-8 text-center text-muted-foreground">
				Kunde inte hitta underentreprenören.
			</Card>
		);
	}

	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-4">
				<CardTitle className="text-2xl font-bold">
					{subcontractor.company_name}
					{subcontractor.is_archived ? (
						<span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
							Arkiverad
						</span>
					) : (
						<span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
							Aktiv
						</span>
					)}
				</CardTitle>
				{!editMode && (
					<Button onClick={() => setEditMode(true)} size="sm">
						Redigera
					</Button>
				)}
			</CardHeader>
			<CardContent className="p-0">
				{editMode ? (
					<div className="p-4">
						<SubcontractorForm
							subcontractor={subcontractor}
							onSubmit={handleUpdate}
							onCancel={() => setEditMode(false)}
							submitLabel="Spara ändringar"
							isEditing
						/>
					</div>
				) : (
					<Tabs defaultValue="overview" className="w-full">
						<TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent p-0 px-4">
							<TabsTrigger value="overview">Översikt</TabsTrigger>
							<TabsTrigger value="contact">Kontakt</TabsTrigger>
							<TabsTrigger value="billing">Fakturering</TabsTrigger>
						</TabsList>

						<TabsContent value="overview" className="space-y-4 p-4">
							<div className="grid gap-4">
								{overviewDetails.map((detail, index) => (
									<div key={index} className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">
											{detail.label}
										</span>
										{detail.link ? (
											<Link
												href={detail.link}
												className="text-sm text-primary hover:underline"
											>
												{detail.value || '-'}
											</Link>
										) : (
											<span className="text-sm">{detail.value || '-'}</span>
										)}
									</div>
								))}
							</div>
						</TabsContent>

						<TabsContent value="contact" className="space-y-4 p-4">
							<div className="space-y-4">
								<InfoRow icon={Mail} label="E-post" value={subcontractor.email} />
								<InfoRow icon={Phone} label="Mobiltelefon" value={subcontractor.phone_mobile} />
								<InfoRow icon={Phone} label="Arbetstelefon" value={subcontractor.phone_work} />
								{(subcontractor.invoice_address_street || subcontractor.invoice_address_city) && (
									<InfoRow
										icon={MapPin}
										label="Fakturaadress"
										value={`${subcontractor.invoice_address_street || ''}, ${subcontractor.invoice_address_zip || ''} ${subcontractor.invoice_address_city || ''}, ${subcontractor.invoice_address_country || ''}`.replace(/,(\s*,)+/g, ',').replace(/^,\s*|,(\s*,)*$/g, '').trim()}
									/>
								)}
								{(subcontractor.delivery_address_street || subcontractor.delivery_address_city) && (
									<InfoRow
										icon={MapPin}
										label="Leveransadress"
										value={`${subcontractor.delivery_address_street || ''}, ${subcontractor.delivery_address_zip || ''} ${subcontractor.delivery_address_city || ''}, ${subcontractor.delivery_address_country || ''}`.replace(/,(\s*,)+/g, ',').replace(/^,\s*|,(\s*,)*$/g, '').trim()}
									/>
								)}
							</div>
						</TabsContent>

						<TabsContent value="billing" className="space-y-4 p-4">
							<div className="space-y-4">
								<InfoRow
									icon={Mail}
									label="Fakturamejl"
									value={subcontractor.invoice_email}
								/>
								{subcontractor.bankgiro && (
									<div className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">
											Bankgiro
										</span>
										<span className="text-sm">{subcontractor.bankgiro}</span>
									</div>
								)}
								{subcontractor.plusgiro && (
									<div className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">
											Plusgiro
										</span>
										<span className="text-sm">{subcontractor.plusgiro}</span>
									</div>
								)}
								{subcontractor.reference && (
									<div className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">
											Referens/Kostnadsställe
										</span>
										<span className="text-sm">{subcontractor.reference}</span>
									</div>
								)}
								{subcontractor.peppol_id && (
									<div className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">
											Peppol-ID
										</span>
										<span className="text-sm">{subcontractor.peppol_id}</span>
									</div>
								)}
								{subcontractor.gln && (
									<div className="flex justify-between">
										<span className="text-sm font-medium text-muted-foreground">GLN</span>
										<span className="text-sm">{subcontractor.gln}</span>
									</div>
								)}
							</div>
						</TabsContent>
					</Tabs>
				)}
			</CardContent>
		</Card>
	);
}

