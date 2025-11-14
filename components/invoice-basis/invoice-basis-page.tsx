"use client";

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	useInvoiceBasis,
	useLockInvoiceBasis,
	useUnlockInvoiceBasis,
	useUpdateInvoiceHeader,
	useUpdateInvoiceLine,
	InvoiceBasisRecord,
} from '@/lib/hooks/use-invoice-basis';
import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';
import { cn } from '@/lib/utils';

interface InvoiceBasisPageProps {
	orgId: string;
	projects: Array<{ id: string; name: string; projectNumber: string | null }>;
}

interface LineEditState {
	description: string;
	article_code: string;
	account: string;
	unit: string;
	quantity: string;
	unit_price: string;
	discount: string;
	vat_rate: string;
	vat_code: string;
}

function formatDefaultPeriodStart(): string {
	const now = new Date();
	const day = now.getDay();
	const diff = now.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(now.setDate(diff));
	return format(monday, 'yyyy-MM-dd');
}

function formatDefaultPeriodEnd(): string {
	const start = new Date(formatDefaultPeriodStart());
	const sunday = new Date(start);
	sunday.setDate(start.getDate() + 6);
	return format(sunday, 'yyyy-MM-dd');
}

export function InvoiceBasisPage({ projects }: InvoiceBasisPageProps) {
	const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? '');
	const [periodStart, setPeriodStart] = useState<string>(formatDefaultPeriodStart());
	const [periodEnd, setPeriodEnd] = useState<string>(formatDefaultPeriodEnd());

	const [headerState, setHeaderState] = useState({
		invoice_series: '',
		invoice_number: '',
		invoice_date: '',
		due_date: '',
		payment_terms_days: '',
		ocr_ref: '',
		our_ref: '',
		your_ref: '',
		currency: 'SEK',
		reverse_charge_building: false,
		rot_rut_flag: false,
		cost_center: '',
		result_unit: '',
	});

	const [lockReason, setLockReason] = useState('');
	const [unlockReason, setUnlockReason] = useState('');
	const [editingLineId, setEditingLineId] = useState<string | null>(null);
	const [lineState, setLineState] = useState<LineEditState | null>(null);

	const {
		data: invoiceBasis,
		isLoading,
		isFetching,
		refetch,
	} = useInvoiceBasis({
		projectId: selectedProject,
		periodStart,
		periodEnd,
		enabled: Boolean(selectedProject),
	});

	const updateHeader = useUpdateInvoiceHeader();
	const updateLine = useUpdateInvoiceLine();
	const lockBasis = useLockInvoiceBasis();
	const unlockBasis = useUnlockInvoiceBasis();

	useEffect(() => {
		if (!invoiceBasis) return;
		setHeaderState({
			invoice_series: invoiceBasis.invoice_series ?? '',
			invoice_number: invoiceBasis.invoice_number ?? '',
			invoice_date: invoiceBasis.invoice_date ?? '',
			due_date: invoiceBasis.due_date ?? '',
			payment_terms_days: invoiceBasis.payment_terms_days?.toString() ?? '',
			ocr_ref: invoiceBasis.ocr_ref ?? '',
			our_ref: invoiceBasis.our_ref ?? '',
			your_ref: invoiceBasis.your_ref ?? '',
			currency: invoiceBasis.currency ?? 'SEK',
			reverse_charge_building: invoiceBasis.reverse_charge_building,
			rot_rut_flag: invoiceBasis.rot_rut_flag,
			cost_center: invoiceBasis.cost_center ?? '',
			result_unit: invoiceBasis.result_unit ?? '',
		});
		setLockReason('');
		setUnlockReason('');
		setEditingLineId(null);
		setLineState(null);
	}, [invoiceBasis?.id]);

	const diaryEntries = invoiceBasis?.lines_json?.diary ?? [];
	const nonDiaryLines = useMemo(
		() => (invoiceBasis?.lines_json?.lines ?? []).filter((line) => line.type !== 'diary'),
		[invoiceBasis?.lines_json?.lines]
	);

	const handleHeaderSubmit = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		try {
			await updateHeader.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				payload: {
					invoice_series: headerState.invoice_series || null,
					invoice_number: headerState.invoice_number || null,
					invoice_date: headerState.invoice_date || null,
					due_date: headerState.due_date || null,
					payment_terms_days: headerState.payment_terms_days ? Number(headerState.payment_terms_days) : null,
					ocr_ref: headerState.ocr_ref || null,
					our_ref: headerState.our_ref || null,
					your_ref: headerState.your_ref || null,
					currency: headerState.currency || 'SEK',
					reverse_charge_building: headerState.reverse_charge_building,
					rot_rut_flag: headerState.rot_rut_flag,
					cost_center: headerState.cost_center || null,
					result_unit: headerState.result_unit || null,
				},
			});
			toast.success('Fakturainformation uppdaterad');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte uppdatera fakturainformation');
		}
	};

	const handleEditLine = (line: InvoiceBasisLine) => {
		setEditingLineId(line.id);
		setLineState({
			description: line.description ?? '',
			article_code: line.article_code ?? '',
			account: line.account ?? '',
			unit: line.unit ?? '',
			quantity: (Number(line.quantity) ?? 0).toString(),
			unit_price: (Number(line.unit_price) ?? 0).toString(),
			discount: (Number(line.discount) ?? 0).toString(),
			vat_rate: (Number(line.vat_rate) ?? 0).toString(),
			vat_code: line.vat_code ?? '',
		});
	};

	const handleCancelLineEdit = () => {
		setEditingLineId(null);
		setLineState(null);
	};

	const handleSubmitLine = async () => {
		if (!editingLineId || !lineState || !selectedProject || !periodStart || !periodEnd) return;
		try {
			await updateLine.mutateAsync({
				projectId: selectedProject,
				lineId: editingLineId,
				periodStart,
				periodEnd,
				payload: {
					description: lineState.description,
					article_code: lineState.article_code,
					account: lineState.account,
					unit: lineState.unit,
					quantity: Number(lineState.quantity),
					unit_price: Number(lineState.unit_price),
					discount: Number(lineState.discount),
					vat_rate: Number(lineState.vat_rate),
					vat_code: lineState.vat_code,
				},
			});
			toast.success('Rad uppdaterad');
			handleCancelLineEdit();
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte uppdatera raden');
		}
	};

	const handleLock = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		try {
			await lockBasis.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				payload: {
					invoiceSeries: headerState.invoice_series || undefined,
					invoiceNumber: headerState.invoice_number || undefined,
					invoiceDate: headerState.invoice_date || undefined,
					paymentTermsDays: headerState.payment_terms_days ? Number(headerState.payment_terms_days) : undefined,
					currency: headerState.currency || undefined,
					reverse_charge_building: headerState.reverse_charge_building,
					rot_rut_flag: headerState.rot_rut_flag,
					ocr_ref: headerState.ocr_ref || undefined,
				},
			});
			toast.success('Fakturaunderlaget är låst');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte låsa underlaget');
		}
	};

	const handleUnlock = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		if (!unlockReason || unlockReason.trim().length < 5) {
			toast.error('Ange en motivering (minst 5 tecken)');
			return;
		}
		try {
			await unlockBasis.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				reason: unlockReason,
			});
			toast.success('Fakturaunderlaget är upplåst');
			setUnlockReason('');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte låsa upp underlaget');
		}
	};

	const totals = invoiceBasis?.totals;

	return (
		<div className='flex h-full flex-col bg-gray-50 dark:bg-black'>
			<header className='sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
				<div className='mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-8'>
					<div>
						<h1 className='text-2xl font-semibold text-foreground'>Fakturaunderlag</h1>
						<p className='text-sm text-muted-foreground'>
							Välj projekt och period för att granska och låsa fakturaunderlag. Dagbok, tid, material och kostnader
							ingår automatiskt.
						</p>
					</div>
					<div className='flex flex-wrap gap-3'>
						<div className='w-56'>
							<Select value={selectedProject} onValueChange={setSelectedProject}>
								<SelectTrigger>
									<SelectValue placeholder='Välj projekt' />
								</SelectTrigger>
								<SelectContent>
									{projects.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.projectNumber ? `${project.projectNumber} – ${project.name}` : project.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='flex items-center gap-2'>
							<label className='text-sm font-medium text-muted-foreground'>Från</label>
							<Input
								type='date'
								value={periodStart}
								onChange={(event) => setPeriodStart(event.target.value)}
							/>
						</div>
						<div className='flex items-center gap-2'>
							<label className='text-sm font-medium text-muted-foreground'>Till</label>
							<Input
								type='date'
								value={periodEnd}
								onChange={(event) => setPeriodEnd(event.target.value)}
							/>
						</div>
						<Button
							variant='outline'
							onClick={() => {
								setPeriodStart(formatDefaultPeriodStart());
								setPeriodEnd(formatDefaultPeriodEnd());
							}}
						>
							Denna vecka
						</Button>
					</div>
				</div>
			</header>

			<main className='mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8'>
				{!selectedProject ? (
					<div className='rounded-lg border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground'>
						Välj ett projekt för att se fakturaunderlag.
					</div>
				) : isLoading || isFetching ? (
					<div className='rounded-lg border border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground'>
						Hämtar fakturaunderlag…
					</div>
				) : invoiceBasis ? (
					<>
						<div className='flex flex-wrap items-center justify-end gap-3'>
							<Button variant='outline' onClick={() => refetch()} disabled={isFetching}>
								{isFetching ? 'Uppdaterar…' : 'Uppdatera underlag'}
							</Button>
							<Button
								variant='ghost'
								onClick={() => {
									window.open(
										'/dashboard/approvals',
										'_blank'
									);
								}}
							>
								Öppna godkännanden
							</Button>
						</div>
						
						{/* Customer Information Section */}
						{(invoiceBasis.customer_snapshot || invoiceBasis.invoice_address_json) && (
							<Card className='border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'>
								<CardHeader>
									<CardTitle className='text-lg'>Kundinformation</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='grid gap-4 md:grid-cols-2'>
										<div className='space-y-3'>
											<div>
												<label className='text-sm font-semibold text-muted-foreground'>Kundnamn</label>
												<p className='text-base font-medium'>
													{invoiceBasis.customer_snapshot && typeof invoiceBasis.customer_snapshot === 'object' && invoiceBasis.customer_snapshot !== null
														? (invoiceBasis.customer_snapshot as { name?: string }).name 
														: invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object'
														? (invoiceBasis.invoice_address_json as { name?: string }).name
														: null || 'Ingen kund kopplad'}
												</p>
											</div>
											{invoiceBasis.customer_snapshot && typeof invoiceBasis.customer_snapshot === 'object' && invoiceBasis.customer_snapshot !== null && (invoiceBasis.customer_snapshot as { org_no?: string }).org_no && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>Organisationsnummer</label>
													<p className='text-base'>
														{(invoiceBasis.customer_snapshot as { org_no?: string }).org_no}
													</p>
												</div>
											)}
											{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (invoiceBasis.invoice_address_json as { org_no?: string }).org_no && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>Organisationsnummer</label>
													<p className='text-base'>
														{(invoiceBasis.invoice_address_json as { org_no?: string }).org_no}
													</p>
												</div>
											)}
											{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>Fakturaadress</label>
													<div className='text-base'>
														{invoiceBasis.invoice_address_json.street && <p>{invoiceBasis.invoice_address_json.street}</p>}
														{invoiceBasis.invoice_address_json.zip && invoiceBasis.invoice_address_json.city && (
															<p>
																{invoiceBasis.invoice_address_json.zip} {invoiceBasis.invoice_address_json.city}
															</p>
														)}
														{invoiceBasis.invoice_address_json.country && (
															<p>{invoiceBasis.invoice_address_json.country}</p>
														)}
													</div>
												</div>
											)}
										</div>
										<div className='space-y-3'>
											{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (invoiceBasis.invoice_address_json as { email?: string }).email && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>E-post</label>
													<p className='text-base'>
														{(invoiceBasis.invoice_address_json as { email?: string }).email}
													</p>
												</div>
											)}
											{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (invoiceBasis.invoice_address_json as { phone?: string }).phone && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>Telefon</label>
													<p className='text-base'>
														{(invoiceBasis.invoice_address_json as { phone?: string }).phone}
													</p>
												</div>
											)}
											{invoiceBasis.delivery_address_json && typeof invoiceBasis.delivery_address_json === 'object' && (
												<div>
													<label className='text-sm font-semibold text-muted-foreground'>Leveransadress</label>
													<div className='text-base'>
														{invoiceBasis.delivery_address_json.street && <p>{invoiceBasis.delivery_address_json.street}</p>}
														{invoiceBasis.delivery_address_json.zip && invoiceBasis.delivery_address_json.city && (
															<p>
																{invoiceBasis.delivery_address_json.zip} {invoiceBasis.delivery_address_json.city}
															</p>
														)}
														{invoiceBasis.delivery_address_json.country && (
															<p>{invoiceBasis.delivery_address_json.country}</p>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						)}
						
						<Card>
							<CardHeader className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
								<CardTitle>Fakturainfo</CardTitle>
								<div className='flex flex-wrap gap-3'>
									{invoiceBasis.locked ? (
										<span className='rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'>
											Låst {invoiceBasis.locked_at ? format(new Date(invoiceBasis.locked_at), 'PPPp', { locale: sv }) : ''}
										</span>
									) : (
										<span className='rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600 dark:bg-amber-500/20 dark:text-amber-200'>
											Utkast (kan redigeras)
										</span>
									)}
								</div>
							</CardHeader>
							<CardContent className='space-y-6'>
								<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Serie</label>
										<Input
											placeholder='Ex. A'
											value={headerState.invoice_series}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, invoice_series: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Fakturanummer</label>
										<Input
											placeholder='Ex. A-2025-001'
											value={headerState.invoice_number}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, invoice_number: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Fakturadatum</label>
										<Input
											type='date'
											value={headerState.invoice_date}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, invoice_date: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Förfallodatum</label>
										<Input
											type='date'
											value={headerState.due_date}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, due_date: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Betalvillkor (dagar)</label>
										<Input
											type='number'
											value={headerState.payment_terms_days}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, payment_terms_days: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>OCR</label>
										<Input
											value={headerState.ocr_ref}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, ocr_ref: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Vår referens</label>
										<Input
											value={headerState.our_ref}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, our_ref: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Er referens</label>
										<Input
											value={headerState.your_ref}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, your_ref: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Valuta</label>
										<Input
											value={headerState.currency}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Kostnadsställe</label>
										<Input
											value={headerState.cost_center}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, cost_center: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium text-muted-foreground'>Resultatenhet</label>
										<Input
											value={headerState.result_unit}
											onChange={(event) =>
												setHeaderState((state) => ({ ...state, result_unit: event.target.value }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
										<span className='text-sm font-medium text-muted-foreground'>Omvänd byggmoms</span>
										<Switch
											checked={headerState.reverse_charge_building}
											onCheckedChange={(checked) =>
												setHeaderState((state) => ({ ...state, reverse_charge_building: checked }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
									<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
										<span className='text-sm font-medium text-muted-foreground'>ROT/RUT flagga</span>
										<Switch
											checked={headerState.rot_rut_flag}
											onCheckedChange={(checked) =>
												setHeaderState((state) => ({ ...state, rot_rut_flag: checked }))
											}
											disabled={invoiceBasis.locked || updateHeader.isPending}
										/>
									</div>
								</div>
								<div className='flex flex-wrap gap-3'>
									<Button onClick={handleHeaderSubmit} disabled={invoiceBasis.locked || updateHeader.isPending}>
										Spara uppgifter
									</Button>
									<Button
										variant='outline'
										onClick={() => {
											if (!invoiceBasis) return;
											setHeaderState({
												invoice_series: invoiceBasis.invoice_series ?? '',
												invoice_number: invoiceBasis.invoice_number ?? '',
												invoice_date: invoiceBasis.invoice_date ?? '',
												due_date: invoiceBasis.due_date ?? '',
												payment_terms_days: invoiceBasis.payment_terms_days?.toString() ?? '',
												ocr_ref: invoiceBasis.ocr_ref ?? '',
												our_ref: invoiceBasis.our_ref ?? '',
												your_ref: invoiceBasis.your_ref ?? '',
												currency: invoiceBasis.currency ?? 'SEK',
												reverse_charge_building: invoiceBasis.reverse_charge_building,
												rot_rut_flag: invoiceBasis.rot_rut_flag,
												cost_center: invoiceBasis.cost_center ?? '',
												result_unit: invoiceBasis.result_unit ?? '',
											});
										}}
										disabled={updateHeader.isPending}
									>
										Återställ
									</Button>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Radlista</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='overflow-hidden rounded-lg border border-border/60'>
									<table className='min-w-full divide-y divide-border/60'>
										<thead className='bg-muted/60'>
											<tr className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
												<th className='px-3 py-3'>Typ</th>
												<th className='px-3 py-3'>Artikel</th>
												<th className='px-3 py-3'>Beskrivning</th>
												<th className='px-3 py-3'>Antal</th>
												<th className='px-3 py-3'>Enhet</th>
												<th className='px-3 py-3'>À-pris</th>
												<th className='px-3 py-3'>Rabatt %</th>
												<th className='px-3 py-3'>Moms %</th>
												<th className='px-3 py-3'>Konto</th>
												<th className='px-3 py-3 text-right'>Summa ex moms</th>
												<th className='px-3 py-3 text-right'>Summa inkl moms</th>
												<th className='px-3 py-3'></th>
											</tr>
										</thead>
										<tbody className='divide-y divide-border/60 bg-background'>
											{nonDiaryLines.map((line) => {
												const isEditing = line.id === editingLineId;
												const { amountExVat, amountIncVat } = (() => {
													const quantity = Number(line.quantity) || 0;
													const unitPrice = Number(line.unit_price) || 0;
													const discount = Number(line.discount) || 0;
													const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
													const ex = quantity * unitPrice * discountFactor;
													const vatRate = Number(line.vat_rate) || 0;
													const vat = ex * (vatRate / 100);
													return {
														amountExVat: Math.round(ex * 100) / 100,
														amountIncVat: Math.round((ex + vat) * 100) / 100,
													};
												})();
												return (
													<tr key={line.id} className='align-top text-sm'>
														<td className='px-3 py-3 font-medium capitalize'>{line.type}</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	value={lineState.article_code}
																	onChange={(event) =>
																		setLineState((state) =>
																			state
																				? { ...state, article_code: event.target.value }
																				: state
																		)
																	}
																	className='h-9'
																/>
															) : (
																line.article_code || '–'
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	value={lineState.description}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, description: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																<div className='space-y-1'>
																	{line.source?.table === 'ata' && line.ata_info && (
																		<div className='flex items-center gap-2'>
																			<span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'>
																				ÄTA: {line.ata_info.ata_number ? `ÄTA ${line.ata_info.ata_number}` : line.ata_info.title}
																			</span>
																		</div>
																	)}
																	<div>{line.description || '–'}</div>
																</div>
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	type='number'
																	value={lineState.quantity}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, quantity: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																Number(line.quantity ?? 0).toLocaleString('sv-SE', {
																	minimumFractionDigits: 0,
																	maximumFractionDigits: 2,
																})
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	value={lineState.unit}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, unit: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																line.unit || '–'
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	type='number'
																	value={lineState.unit_price}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, unit_price: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																`${Number(line.unit_price ?? 0).toLocaleString('sv-SE', {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})} kr`
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	type='number'
																	value={lineState.discount}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, discount: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																`${Number(line.discount ?? 0).toLocaleString('sv-SE', {
																	minimumFractionDigits: 0,
																	maximumFractionDigits: 2,
																})}%`
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	type='number'
																	value={lineState.vat_rate}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, vat_rate: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																`${Number(line.vat_rate ?? 0).toLocaleString('sv-SE', {
																	minimumFractionDigits: 0,
																	maximumFractionDigits: 1,
																})}%`
															)}
														</td>
														<td className='px-3 py-3'>
															{isEditing && lineState ? (
																<Input
																	value={lineState.account}
																	onChange={(event) =>
																		setLineState((state) =>
																			state ? { ...state, account: event.target.value } : state
																		)
																	}
																	className='h-9'
																/>
															) : (
																line.account || '–'
															)}
														</td>
														<td className='px-3 py-3 text-right'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
														<td className='px-3 py-3 text-right'>{amountIncVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
														<td className='px-3 py-3 text-right'>
															{isEditing ? (
																<div className='flex justify-end gap-2'>
																	<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending}>
																		Spara
																	</Button>
																	<Button size='sm' variant='ghost' onClick={handleCancelLineEdit}>
																		Avbryt
																	</Button>
																</div>
															) : (
																<Button
																	size='sm'
																	variant='outline'
																	onClick={() => handleEditLine(line)}
																	disabled={invoiceBasis.locked}
																>
																	Redigera
																</Button>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								{diaryEntries.length > 0 && (
									<div className='rounded-lg border border-border/60 bg-background'>
										<div className='border-b border-border/60 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
											Dagboksrader och ÄTA-beskrivningar (ingår i fakturatext)
										</div>
										<div className='space-y-3 p-4'>
											{diaryEntries.map((entry) => {
												const isAta = entry.line_ref?.startsWith('ata-');
												return (
													<div key={entry.line_ref} className='rounded-md border border-border/40 bg-muted/40 p-3 text-sm'>
														<div className='flex items-center gap-2 mb-2'>
															<div className='font-semibold text-foreground'>
																{format(new Date(entry.date), 'PPP', { locale: sv })}
															</div>
															{isAta && (
																<span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'>
																	ÄTA
																</span>
															)}
														</div>
														<div className='text-muted-foreground'>{entry.summary}</div>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Summeringar</CardTitle>
							</CardHeader>
							<CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
								<div className='rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4'>
									<div className='text-xs uppercase text-emerald-600 dark:text-emerald-300'>Netto exkl. moms</div>
									<div className='text-2xl font-semibold text-foreground'>
										{totals?.total_ex_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
									</div>
								</div>
								<div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-4'>
									<div className='text-xs uppercase text-amber-600 dark:text-amber-300'>Moms</div>
									<div className='text-2xl font-semibold text-foreground'>
										{totals?.total_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
									</div>
								</div>
								<div className='rounded-lg border border-blue-500/30 bg-blue-500/5 p-4'>
									<div className='text-xs uppercase text-blue-600 dark:text-blue-300'>Totalt</div>
									<div className='text-2xl font-semibold text-foreground'>
										{totals?.total_inc_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
									</div>
								</div>
								{totals?.per_vat_rate &&
									Object.entries(totals.per_vat_rate).map(([rate, values]) => (
										<div key={rate} className='rounded-lg border border-border/60 bg-muted/40 p-4'>
											<div className='text-xs uppercase text-muted-foreground'>Moms {rate}%</div>
											<div className='text-sm text-muted-foreground'>
												Exkl: {values.base.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
											</div>
											<div className='text-sm text-muted-foreground'>
												Moms: {values.vat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
											</div>
											<div className='text-sm text-muted-foreground'>
												Inkl: {values.total.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
											</div>
										</div>
									))}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Låsning & Export</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<p className='text-sm text-muted-foreground'>
									Ett fakturaunderlag måste låsas innan det kan exporteras eller skickas till Fortnox/Visma. När underlaget
									låses beräknas OCR och hash-signatur. Upplåsning kräver motivering och loggas.
								</p>
								<div className='flex flex-wrap gap-3'>
									<Button
										onClick={handleLock}
										disabled={invoiceBasis.locked || lockBasis.isPending || !invoiceBasis.lines_json?.lines?.length}
									>
										{lockBasis.isPending ? 'Låser…' : 'Lås underlaget'}
									</Button>
									<div className={cn('flex items-center gap-2', invoiceBasis.locked ? 'opacity-100' : 'opacity-70')}>
										<Textarea
											placeholder='Motivering för upplåsning (minst 5 tecken)'
											value={unlockReason}
											onChange={(event) => setUnlockReason(event.target.value)}
											disabled={!invoiceBasis.locked || unlockBasis.isPending}
											className='min-h-[46px] w-64'
										/>
										<Button
											variant='outline'
											onClick={handleUnlock}
											disabled={!invoiceBasis.locked || unlockBasis.isPending}
										>
											{unlockBasis.isPending ? 'Öppnar…' : 'Lås upp'}
										</Button>
									</div>
									<Button
										variant='outline'
										className='ml-auto'
										onClick={() => {
											if (!invoiceBasis.locked) {
												toast.error('Lås underlaget innan export');
												return;
											}
											window.open(
												`/api/exports/invoice?projectId=${selectedProject}&start=${periodStart}&end=${periodEnd}`,
												'_blank'
											);
										}}
									>
										Ladda ner CSV
									</Button>
									<Button
										variant='outline'
										onClick={() => {
											if (!invoiceBasis.locked) {
												toast.error('Lås underlaget innan export');
												return;
											}
											window.open(
												`/api/exports/invoice/pdf?projectId=${selectedProject}&start=${periodStart}&end=${periodEnd}`,
												'_blank'
											);
										}}
									>
										Ladda ner PDF
									</Button>
								</div>
							</CardContent>
						</Card>
					</>
				) : (
					<div className='flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/60 bg-background/60 p-6 text-center text-sm text-muted-foreground'>
						<p>
							Inget underlag hittades för vald period. Kontrollera att tid, material, utlägg och ÄTA är
							godkända och att en dagbokspost finns om du vill se fakturatext.
						</p>
						<div className='flex flex-wrap items-center justify-center gap-3 text-xs'>
							<Button variant='outline' onClick={() => refetch()}>
								Försök igen
							</Button>
							<Button
								variant='ghost'
								onClick={() => window.open('/dashboard/approvals', '_blank')}
							>
								Öppna godkännanden
							</Button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}


