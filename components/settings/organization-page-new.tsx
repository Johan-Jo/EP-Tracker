'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, CalendarClock, Loader2, MapPin, Phone, Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';

type BreakRow = {
	id: string;
	label: string;
	start: string;
	end: string;
};

type OrganizationBreak = {
	label?: string | null;
	start?: string | null;
	end?: string | null;
};

interface OrganizationPageNewProps {
	organization: {
		id: string;
		name: string;
		org_number: string | null;
		phone: string | null;
		address: string | null;
		postal_code: string | null;
		city: string | null;
		vat_registered: boolean;
		vat_number: string | null;
		default_vat_rate: number | null;
		default_work_day_start: string | null;
		default_work_day_end: string | null;
		standard_work_hours_per_day: number | null;
		standard_breaks: OrganizationBreak[];
		created_at: string;
	};
}

type OrganizationUpdatePayload = {
	name: string;
	orgNumber?: string | null;
	phone?: string | null;
	address?: string | null;
	postalCode?: string | null;
	city?: string | null;
	vatRegistered: boolean;
	vatNumber?: string | null;
	defaultVatRate?: string | number | null;
	defaultWorkDayStart: string;
	defaultWorkDayEnd: string;
	standardWorkHours?: string | number | null;
	breaks: Array<{ label?: string | null; start: string; end: string }>;
};

const generateId = () =>
	typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const toTimeInputValue = (value?: string | null, fallback = '07:00') => {
	if (!value) return fallback;
	const time = value.includes(':') ? value.slice(0, 5) : value;
	return /^[0-2]\d:[0-5]\d$/.test(time) ? time : fallback;
};

const formatBreaks = (breaks: OrganizationBreak[] | undefined): BreakRow[] => {
	if (!Array.isArray(breaks) || breaks.length === 0) {
		return [
			{
				id: generateId(),
				label: 'Lunch',
				start: '11:00',
				end: '12:00',
			},
		];
	}

	const formatted = breaks
		.map((item) => {
			const start = toTimeInputValue(item?.start, '');
			const end = toTimeInputValue(item?.end, '');
			if (!start || !end) return null;
			return {
				id: generateId(),
				label: (item?.label ?? '') || '',
				start,
				end,
			};
		})
		.filter((item): item is BreakRow => item !== null);

	if (formatted.length === 0) {
		return [
			{
				id: generateId(),
				label: 'Lunch',
				start: '11:00',
				end: '12:00',
			},
		];
	}

	return formatted;
};

const isValidTime = (value: string) => /^[0-2]\d:[0-5]\d$/.test(value);
const timeToMinutes = (value: string) => {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
};

export function OrganizationPageNew({ organization }: OrganizationPageNewProps) {
	const router = useRouter();
	const [organizationName, setOrganizationName] = useState(organization.name);
	const [orgNumber, setOrgNumber] = useState(organization.org_number ?? '');
	const [phone, setPhone] = useState(organization.phone ?? '');
	const [address, setAddress] = useState(organization.address ?? '');
	const [postalCode, setPostalCode] = useState(organization.postal_code ?? '');
	const [city, setCity] = useState(organization.city ?? '');
	const [vatRegistered, setVatRegistered] = useState<boolean>(organization.vat_registered ?? false);
	const [vatNumber, setVatNumber] = useState(organization.vat_number ?? '');
	const [vatRate, setVatRate] = useState(
		organization.default_vat_rate !== null && organization.default_vat_rate !== undefined
			? organization.default_vat_rate.toString()
			: ''
	);
	const [workDayStart, setWorkDayStart] = useState(toTimeInputValue(organization.default_work_day_start, '07:00'));
	const [workDayEnd, setWorkDayEnd] = useState(toTimeInputValue(organization.default_work_day_end, '16:00'));
	const [standardWorkHours, setStandardWorkHours] = useState(
		organization.standard_work_hours_per_day !== null && organization.standard_work_hours_per_day !== undefined
			? organization.standard_work_hours_per_day.toString()
			: ''
	);
	const [addressSelectionValid, setAddressSelectionValid] = useState<boolean>(
		Boolean((organization.address ?? '').trim() && (organization.postal_code ?? '').trim() && (organization.city ?? '').trim())
	);

	const initialBreaks = useMemo(() => formatBreaks(organization.standard_breaks), [organization.standard_breaks]);
	const [breaks, setBreaks] = useState<BreakRow[]>(initialBreaks);

	const totalBreakMinutes = useMemo(() => {
		return breaks.reduce((sum, current) => {
			if (!isValidTime(current.start) || !isValidTime(current.end)) return sum;
			const diff = timeToMinutes(current.end) - timeToMinutes(current.start);
			return diff > 0 ? sum + diff : sum;
		}, 0);
	}, [breaks]);

	const handleAddBreak = () => {
		setBreaks((prev) => [
			...prev,
			{
				id: generateId(),
				label: '',
				start: '11:00',
				end: '12:00',
			},
		]);
	};

	const handleBreakChange = (id: string, field: keyof BreakRow, value: string) => {
		setBreaks((prev) =>
			prev.map((item) => (item.id === id ? { ...item, [field]: field === 'label' ? value : value.slice(0, 5) } : item))
		);
	};

	const handleRemoveBreak = (id: string) => {
		setBreaks((prev) => prev.filter((item) => item.id !== id));
	};

	const handleAddressChange = (value: string) => {
		setAddress(value);
		setAddressSelectionValid(false);
		setPostalCode('');
		setCity('');
	};

const handleAddressSelect = (selected: {
	address_line1: string;
	address_line2?: string;
	postal_code: string;
	city: string;
	country: string;
	lat: number;
	lon: number;
}) => {
	const displayAddress =
		selected.address_line1 ||
		selected.address_line2 ||
		`${selected.postal_code ?? ''} ${selected.city ?? ''}`.trim();

	setAddress((prev) => {
		const trimmedDisplay = displayAddress.trim();
		return trimmedDisplay.length > 0 ? trimmedDisplay : prev;
	});
	setPostalCode(selected.postal_code ?? '');
	setCity(selected.city ?? '');
	setAddressSelectionValid(true);
};

	const updateOrganizationMutation = useMutation({
		mutationFn: async (data: OrganizationUpdatePayload) => {
			const response = await fetch('/api/organizations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera organisation');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Organisationsinställningar sparade!');
			router.refresh();
		},
		onError: (error: Error) => {
			console.error('Organization update error:', error);
			toast.error(error.message || 'Kunde inte spara ändringar');
		},
	});

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!organizationName.trim()) {
			toast.error('Organisationsnamn krävs');
			return;
		}

		if (!isValidTime(workDayStart) || !isValidTime(workDayEnd)) {
			toast.error('Start- och sluttid måste anges i formatet HH:MM');
			return;
		}

		if (timeToMinutes(workDayEnd) <= timeToMinutes(workDayStart)) {
			toast.error('Sluttid måste vara senare än starttid');
			return;
		}

		if (!addressSelectionValid || !address.trim() || !postalCode.trim() || !city.trim()) {
			toast.error('Sök och välj en adress från listan för att fylla i postnummer och ort automatiskt');
			return;
		}

		if (standardWorkHours) {
			const parsed = Number(standardWorkHours);
			if (Number.isNaN(parsed) || parsed < 0 || parsed > 24) {
				toast.error('Ordinarie arbetstid måste vara ett tal mellan 0 och 24 timmar');
				return;
			}
		}

		const breakPayload: Array<{ label?: string | null; start: string; end: string }> = [];
		for (const item of breaks) {
			const start = (item.start || '').trim();
			const end = (item.end || '').trim();
			const label = item.label.trim() ? item.label.trim() : undefined;

			if (!start && !end && !label) {
				continue;
			}

			if (!start || !end) {
				toast.error('Alla raster måste ha både start- och sluttid');
				return;
			}
			if (!isValidTime(start) || !isValidTime(end)) {
				toast.error('Alla raster måste ha start- och sluttid i formatet HH:MM');
				return;
			}
			if (timeToMinutes(end) <= timeToMinutes(start)) {
				toast.error('Raster måste ha sluttid efter starttid');
				return;
			}

			breakPayload.push({
				label,
				start,
				end,
			});
		}

		let vatRateValue: string | undefined = undefined;
		if (vatRegistered) {
			if (vatRate) {
				const parsed = Number(vatRate);
				if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
					toast.error('Momssats måste vara ett tal mellan 0 och 100');
					return;
				}
				vatRateValue = parsed.toString();
			}
		}

		const payload: OrganizationUpdatePayload = {
			name: organizationName.trim(),
			orgNumber: orgNumber.trim() || null,
			phone: phone.trim() || null,
			address: address.trim() || null,
			postalCode: postalCode.trim() || null,
			city: city.trim() || null,
			vatRegistered,
			vatNumber: vatRegistered ? vatNumber.trim() || null : null,
			defaultVatRate: vatRegistered ? vatRateValue ?? null : null,
			defaultWorkDayStart: workDayStart,
			defaultWorkDayEnd: workDayEnd,
			standardWorkHours: standardWorkHours ? Number(standardWorkHours) : null,
			breaks: breakPayload,
		};

		updateOrganizationMutation.mutate(payload);
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>Organisationsinställningar</h1>
						<p className='text-sm text-muted-foreground'>
							Hantera bolagets kontaktuppgifter, momsregistrering och ordinarie arbetstider
						</p>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-4xl'>
				<form onSubmit={handleSubmit} className='space-y-6'>
					<section className='bg-card border-2 border-border rounded-xl p-6'>
						<div className='flex items-start gap-3 mb-6'>
							<div className='p-2 rounded-lg bg-accent shrink-0'>
								<Building2 className='w-5 h-5 text-primary' />
							</div>
							<div>
								<h2 className='text-lg font-semibold mb-1'>Bolagsinformation</h2>
								<p className='text-sm text-muted-foreground'>
									Grunduppgifter som visas i rapporter och exportfiler
								</p>
							</div>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
							<div className='space-y-2'>
								<Label htmlFor='organization-name'>Organisationsnamn</Label>
								<Input
									id='organization-name'
									value={organizationName}
									onChange={(event) => setOrganizationName(event.target.value)}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='organization-number'>Organisationsnummer</Label>
								<Input
									id='organization-number'
									value={orgNumber}
									onChange={(event) => setOrgNumber(event.target.value)}
									placeholder='556123-4567'
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='phone-number' className='flex items-center gap-2'>
									<Phone className='w-4 h-4 text-muted-foreground' />
									Telefon
								</Label>
								<Input
									id='phone-number'
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
									placeholder='+46 10 123 45 67'
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='address-line' className='flex items-center gap-2'>
									<MapPin className='w-4 h-4 text-muted-foreground' />
									Adress
								</Label>
								<AddressAutocomplete
									id='address-line'
									name='address-line'
									autoComplete='street-address'
									value={address}
									onChange={handleAddressChange}
									onSelect={handleAddressSelect}
									placeholder='Sök adress (Geoapify)'
								/>
								<p className='text-xs text-muted-foreground'>
									Välj adress via sökförslagen. Fälten för postnummer och ort fylls automatiskt och kan inte redigeras manuellt.
								</p>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='postal-code'>Postnummer</Label>
								<Input
									id='postal-code'
									value={postalCode}
									readOnly
									placeholder='123 45'
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='city'>Stad</Label>
								<Input
									id='city'
									value={city}
									readOnly
									placeholder='Stockholm'
								/>
							</div>
						</div>

						<div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-5'>
							<div className='md:col-span-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground'>
								<p>
									Organisation skapades{' '}
									<strong>
										{new Date(organization.created_at).toLocaleDateString('sv-SE', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</strong>
									. ID: <code className='font-mono text-xs'>{organization.id}</code>
								</p>
							</div>
						</div>
					</section>

					<section className='bg-card border-2 border-border rounded-xl p-6'>
						<div className='flex items-start gap-3 mb-6'>
							<div className='p-2 rounded-lg bg-accent shrink-0'>
								<Receipt className='w-5 h-5 text-primary' />
							</div>
							<div>
								<h2 className='text-lg font-semibold mb-1'>Momsregistrering</h2>
								<p className='text-sm text-muted-foreground'>
									Uppgifterna används i fakturaunderlag och exportfiler
								</p>
							</div>
						</div>

						<div className='flex items-center justify-between rounded-lg border border-border px-4 py-3'>
							<div>
								<p className='text-sm font-medium'>Bolaget är momsregistrerat</p>
								<p className='text-xs text-muted-foreground'>
									Styr om moms ska inkluderas och vilket nummer som visas på rapporter
								</p>
							</div>
							<Switch checked={vatRegistered} onCheckedChange={setVatRegistered} />
						</div>

						{vatRegistered && (
							<div className='grid grid-cols-1 md:grid-cols-2 gap-5 mt-5'>
								<div className='space-y-2'>
									<Label htmlFor='vat-number'>Momsregistreringsnummer (VAT)</Label>
									<Input
										id='vat-number'
										value={vatNumber}
										onChange={(event) => setVatNumber(event.target.value)}
										placeholder='SE556123456701'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='vat-rate'>Standard momssats (%)</Label>
									<Input
										id='vat-rate'
										type='number'
										min='0'
										max='100'
										step='0.01'
										value={vatRate}
										onChange={(event) => setVatRate(event.target.value)}
										placeholder='25'
									/>
								</div>
							</div>
						)}
					</section>

					<section className='bg-card border-2 border-border rounded-xl p-6'>
						<div className='flex items-start gap-3 mb-6'>
							<div className='p-2 rounded-lg bg-accent shrink-0'>
								<CalendarClock className='w-5 h-5 text-primary' />
							</div>
							<div>
								<h2 className='text-lg font-semibold mb-1'>Ordinarie arbetstid</h2>
								<p className='text-sm text-muted-foreground'>
									Standardvärden som används när nya projekt skapas och vid schemaläggning
								</p>
							</div>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
							<div className='space-y-2'>
								<Label htmlFor='workday-start'>Starttid</Label>
								<Input
									id='workday-start'
									type='time'
									value={workDayStart}
									onChange={(event) => setWorkDayStart(event.target.value)}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='workday-end'>Sluttid</Label>
								<Input
									id='workday-end'
									type='time'
									value={workDayEnd}
									onChange={(event) => setWorkDayEnd(event.target.value)}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='standard-hours'>Ordinarie arbetstid (timmar/dag)</Label>
								<Input
									id='standard-hours'
									type='number'
									min='0'
									max='24'
									step='0.25'
									value={standardWorkHours}
									onChange={(event) => setStandardWorkHours(event.target.value)}
									placeholder='8'
								/>
							</div>
						</div>

						<div className='mt-6 rounded-lg border border-dashed border-border p-4'>
							<div className='flex items-center justify-between mb-4'>
								<div>
									<h3 className='text-sm font-semibold'>Raster under dagen</h3>
									<p className='text-xs text-muted-foreground'>
										Definiera standardpauser. Dessa används för att räkna ut nettotid och visas för projekt.
									</p>
								</div>
								<Button type='button' variant='outline' size='sm' onClick={handleAddBreak}>
									<Plus className='w-4 h-4 mr-1' />
									Lägg till rast
								</Button>
							</div>

							<div className='space-y-3'>
								{breaks.length === 0 && (
									<p className='text-xs text-muted-foreground'>
										Inga standardraster definierade. Klicka på &quot;Lägg till rast&quot; för att lägga till exempelvis
										lunch.
									</p>
								)}

								{breaks.map((breakItem) => (
									<div
										key={breakItem.id}
										className='grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,auto] gap-3 items-center bg-muted/30 border border-border rounded-lg p-3'
									>
										<Input
											placeholder='Beskrivning (ex: Lunch)'
											value={breakItem.label}
											onChange={(event) => handleBreakChange(breakItem.id, 'label', event.target.value)}
										/>
										<Input
											type='time'
											value={breakItem.start}
											onChange={(event) => handleBreakChange(breakItem.id, 'start', event.target.value)}
											className='md:text-sm'
										/>
										<Input
											type='time'
											value={breakItem.end}
											onChange={(event) => handleBreakChange(breakItem.id, 'end', event.target.value)}
											className='md:text-sm'
										/>
										<Button
											type='button'
											variant='ghost'
											size='icon'
											onClick={() => handleRemoveBreak(breakItem.id)}
											className='text-muted-foreground hover:text-destructive'
										>
											<Trash2 className='w-4 h-4' />
										</Button>
									</div>
								))}
							</div>

							<div className='mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
								<span>
									Total rasttid:{' '}
									<strong>
										{Math.floor(totalBreakMinutes / 60)} h {totalBreakMinutes % 60} min
									</strong>
								</span>
								<span className='hidden md:inline-block'>•</span>
								<span>
									Gäller som förslag när nya projekt skapas och kan justeras per projekt vid behov.
								</span>
							</div>
						</div>
					</section>

					<div className='flex justify-end pt-2'>
						<Button
							type='submit'
							className='h-12 px-6 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all'
							disabled={updateOrganizationMutation.isPending}
						>
							{updateOrganizationMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
							{updateOrganizationMutation.isPending ? 'Sparar...' : 'Spara organisationsinställningar'}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}

