'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, Phone, MapPin, Calendar, DollarSign, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type Employee } from '@/lib/schemas/employee';
import {
	useEmployee,
	useUpdateEmployee,
} from '@/lib/hooks/use-employees';
import { EmployeeForm } from './employee-form';
import { formatSwedishPersonalIdentityNumber } from '@/lib/utils/swedish';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

type EmployeeCardProps = {
	employeeId: string;
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

export function EmployeeCard({ employeeId }: EmployeeCardProps) {
	const [editMode, setEditMode] = useState(false);
	const { data: employee, isLoading } = useEmployee(employeeId);
	const updateEmployee = useUpdateEmployee();

	// Fetch linked user profile if user_id exists
	const { data: linkedUser } = useQuery<OrganizationMember | null>({
		queryKey: ['organization-member', employee?.user_id],
		queryFn: async () => {
			if (!employee?.user_id) return null;
			const response = await fetch('/api/organizations/members');
			if (!response.ok) return null;
			const data = await response.json();
			return data.members?.find((m: OrganizationMember) => m.user_id === employee.user_id) || null;
		},
		enabled: !!employee?.user_id,
	});

	const overviewDetails = useMemo(() => {
		if (!employee) {
			return [];
		}

		const details: Array<{ label: string; value?: string; link?: string }> = [
			{
				label: 'Personalnummer',
				value: employee.employee_no,
			},
		];

		if (employee.user_id && linkedUser?.profiles) {
			const profile = linkedUser.profiles;
			const displayName = profile.full_name || profile.email;
			details.push({
				label: 'Kopplad användare',
				value: `${displayName} (${profile.email})`,
				link: `/dashboard/settings/users`,
			});
		}

		if (employee.personal_identity_no) {
			try {
				const formatted = formatSwedishPersonalIdentityNumber(employee.personal_identity_no);
				details.push({
					label: 'Personnummer',
					value: formatted ?? undefined,
				});
			} catch {
				details.push({
					label: 'Personnummer',
					value: employee.personal_identity_no,
				});
			}
		}

		details.push(
			{
				label: 'Anställningstyp',
				value:
					employee.employment_type === 'FULL_TIME'
						? 'Heltid'
						: employee.employment_type === 'PART_TIME'
							? 'Deltid'
							: employee.employment_type === 'CONTRACTOR'
								? 'Konsult'
								: 'Temporär',
			},
			{
				label: 'Timpris',
				value: employee.hourly_rate_sek
					? `${employee.hourly_rate_sek.toFixed(2)} SEK`
					: undefined,
			}
		);

		if (employee.employment_start_date) {
			try {
				const date = new Date(employee.employment_start_date);
				details.push({
					label: 'Anställningsdatum',
					value: format(date, 'PPP', { locale: sv }),
				});
			} catch {
				details.push({
					label: 'Anställningsdatum',
					value: employee.employment_start_date,
				});
			}
		}

		if (employee.employment_end_date) {
			try {
				const date = new Date(employee.employment_end_date);
				details.push({
					label: 'Slutdatum',
					value: format(date, 'PPP', { locale: sv }),
				});
			} catch {
				details.push({
					label: 'Slutdatum',
					value: employee.employment_end_date,
				});
			}
		}

		return details;
	}, [employee]);

	const handleUpdate = async (payload: Parameters<typeof updateEmployee.mutateAsync>[0]['payload']) => {
		await updateEmployee.mutateAsync({
			id: employeeId,
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

	if (!employee) {
		return (
			<Card>
				<CardContent className="p-8">
					<p className="text-muted-foreground">Personal hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	if (editMode) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Redigera personal</CardTitle>
				</CardHeader>
				<CardContent>
					<EmployeeForm
						employee={employee}
						onSubmit={handleUpdate}
						onCancel={() => setEditMode(false)}
						submitLabel="Spara ändringar"
						isEditing={true}
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>
						{employee.first_name} {employee.last_name}
					</CardTitle>
					<Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
						Redigera
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="overview" className="w-full">
					<TabsList>
						<TabsTrigger value="overview">Översikt</TabsTrigger>
						<TabsTrigger value="contact">Kontakt</TabsTrigger>
						<TabsTrigger value="employment">Anställning</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
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

					<TabsContent value="contact" className="space-y-4">
						<div className="space-y-4">
							<InfoRow icon={Mail} label="E-post" value={employee.email} />
							<InfoRow icon={Phone} label="Mobiltelefon" value={employee.phone_mobile} />
							<InfoRow icon={Phone} label="Arbetstelefon" value={employee.phone_work} />
							{employee.address_street && (
								<div className="flex items-start gap-3">
									<MapPin className="h-4 w-4 text-muted-foreground mt-1" />
									<div>
										<p className="text-sm font-medium">Adress</p>
										<p className="text-sm text-muted-foreground">
											{employee.address_street}
											{employee.address_zip && employee.address_city && (
												<>
													<br />
													{employee.address_zip} {employee.address_city}
												</>
											)}
											{employee.address_country && (
												<>
													<br />
													{employee.address_country}
												</>
											)}
										</p>
									</div>
								</div>
							)}
						</div>
					</TabsContent>

					<TabsContent value="employment" className="space-y-4">
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Anställningstyp</p>
									<p className="text-sm text-muted-foreground">
										{employee.employment_type === 'FULL_TIME'
											? 'Heltid'
											: employee.employment_type === 'PART_TIME'
												? 'Deltid'
												: employee.employment_type === 'CONTRACTOR'
													? 'Konsult'
													: 'Temporär'}
									</p>
								</div>
							</div>
							{employee.hourly_rate_sek && (
								<div className="flex items-center gap-3">
									<DollarSign className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Timpris</p>
										<p className="text-sm text-muted-foreground">
											{employee.hourly_rate_sek.toFixed(2)} SEK
										</p>
									</div>
								</div>
							)}
							{employee.employment_start_date && (
								<div className="flex items-center gap-3">
									<Calendar className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Anställningsdatum</p>
										<p className="text-sm text-muted-foreground">
											{format(new Date(employee.employment_start_date), 'PPP', {
												locale: sv,
											})}
										</p>
									</div>
								</div>
							)}
							{employee.employment_end_date && (
								<div className="flex items-center gap-3">
									<Calendar className="h-4 w-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Slutdatum</p>
										<p className="text-sm text-muted-foreground">
											{format(new Date(employee.employment_end_date), 'PPP', {
												locale: sv,
											})}
										</p>
									</div>
								</div>
							)}
							{employee.notes && (
								<div>
									<p className="text-sm font-medium mb-2">Anteckningar</p>
									<p className="text-sm text-muted-foreground whitespace-pre-wrap">
										{employee.notes}
									</p>
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

