'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import {
	FileText,
	Calendar,
	RefreshCw,
	CheckCircle2,
	Info,
	Clock,
	Package,
	Receipt,
	BookOpen,
	Lock,
	Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useInvoiceBasisGrouped } from '@/lib/hooks/use-invoice-basis-grouped';
import { InvoiceStepIndicator, InvoiceStep } from './invoice-step-indicator';
import { InvoiceProjectFilter } from './invoice-project-filter';
import { InvoicePendingApprovals } from './invoice-pending-approvals';
import { InvoiceLanding } from '@/components/invoices/invoice-landing';
import { cn } from '@/lib/utils';

interface InvoiceBasisPageProps {
	orgId: string;
	projects: Array<{ id: string; name: string; projectNumber: string | null }>;
	userRole?: 'admin' | 'foreman' | 'finance';
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

type Step = 'select' | 'approvals' | 'preview' | 'lock';

export function InvoiceBasisPage({ projects, userRole = 'admin' }: InvoiceBasisPageProps) {
	const canApprove = userRole === 'admin' || userRole === 'foreman';
	const canEdit = userRole === 'admin';
	const canLock = userRole === 'admin';
	const roleForLanding: 'admin' | 'finance' = canApprove ? 'admin' : 'finance';

	// Step 1: Project & Period Selection
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
	// Start utan förvalda datum – vi sätter dem när användaren valt projekt
	const [periodStart, setPeriodStart] = useState<string>('');
	const [periodEnd, setPeriodEnd] = useState<string>('');
	const [currentStep, setCurrentStep] = useState<Step>('select');
	const [hasFetchedBasis, setHasFetchedBasis] = useState(false);

	// Step 3: Invoice Preview (for single project - TODO: support multi-project)
	const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? '');

	const [headerState, setHeaderState] = useState({
		invoice_series: '',
		invoice_number: '',
		invoice_date: '',
		due_date: '',
		payment_terms_days: '',
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

	// Fetch grouped basis data for Step 2
	const {
		data: basisGrouped,
		isLoading: isLoadingGrouped,
		refetch: refetchGrouped,
	} = useInvoiceBasisGrouped({
		projectIds: selectedProjectIds,
		from: periodStart,
		to: periodEnd,
		enabled: hasFetchedBasis && selectedProjectIds.length > 0 && !!periodStart && !!periodEnd,
	});

	// Fetch invoice basis for Step 3 (single project)
	const {
		data: invoiceBasis,
		isLoading: isLoadingBasis,
		isFetching: isFetchingBasis,
		refetch: refetchBasis,
	} = useInvoiceBasis({
		projectId: selectedProject,
		periodStart,
		periodEnd,
		enabled: currentStep === 'preview' && !!selectedProject && !!periodStart && !!periodEnd,
	});

	const updateHeader = useUpdateInvoiceHeader();
	const updateLine = useUpdateInvoiceLine();
	const lockBasis = useLockInvoiceBasis();
	const unlockBasis = useUnlockInvoiceBasis();

	// Handle fetch basis button click
	const handleFetchBasis = async () => {
		if (selectedProjectIds.length === 0) {
			toast.error('Välj minst ett projekt');
			return;
		}

		let nextFrom = periodStart;
		let nextTo = periodEnd;

		// Om inget datum är valt och exakt ett projekt är markerat – försök att hämta intervall automatiskt
		if ((!nextFrom || !nextTo) && selectedProjectIds.length === 1) {
			const projectId = selectedProjectIds[0];
			try {
				const params = new URLSearchParams({ projectId });
				const res = await fetch(`/api/invoice/project-date-range?${params.toString()}`, {
					headers: { 'Content-Type': 'application/json' },
				});
				if (res.ok) {
					const data = await res.json();
					if (data?.hasData && data.from && data.to) {
						nextFrom = data.from;
						nextTo = data.to;
						setPeriodStart(data.from);
						setPeriodEnd(data.to);
						toast.info('Vi har satt perioden automatiskt efter alla relevanta rader för projektet.', {
							description: `${data.from} till ${data.to}`,
						});
					}
				}
			} catch (error) {
				console.error('project-date-range error in handleFetchBasis', error);
				toast.error('Kunde inte föreslå datumspann automatiskt. Välj period manuellt.');
			}
		}

		if (!nextFrom || !nextTo) {
			toast.error('Välj ett datumspann innan du hämtar underlag.');
			return;
		}

		if (new Date(nextFrom) > new Date(nextTo)) {
			toast.error('Från-datum måste vara före eller samma som till-datum');
			return;
		}

		// Uppdatera state om vi har justerat datumen
		if (nextFrom !== periodStart) setPeriodStart(nextFrom);
		if (nextTo !== periodEnd) setPeriodEnd(nextTo);

		setHasFetchedBasis(true);
		setCurrentStep('approvals');
		// Själva datan hämtas automatiskt via useInvoiceBasisGrouped när hasFetchedBasis=true och datum/projekt ändras
	};

	// Handle approvals complete - called från Steg 2 (InvoicePendingApprovals)
	const handleApprovalsComplete = () => {
		// Use first selected project for now (TODO: support multi-project invoice basis)
		if (selectedProjectIds.length > 0) {
			setSelectedProject(selectedProjectIds[0]);
			setCurrentStep('preview');
			refetchBasis();
		}
	};

	useEffect(() => {
		if (!invoiceBasis) return;
		setHeaderState({
			invoice_series: invoiceBasis.invoice_series ?? '',
			invoice_number: invoiceBasis.invoice_number ?? '',
			invoice_date: invoiceBasis.invoice_date ?? '',
			due_date: invoiceBasis.due_date ?? '',
			payment_terms_days: invoiceBasis.payment_terms_days?.toString() ?? '',
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
	const hasInvoiceLines = (invoiceBasis?.lines_json?.lines?.length ?? 0) > 0;

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
			setCurrentStep('preview');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte låsa upp underlaget');
		}
	};

	const totals = invoiceBasis?.totals;

	const canFetch = selectedProjectIds.length > 0 && !!periodStart && !!periodEnd;

	// När ett projekt väljs (single-select) – sätt perioden till alla relevanta rader
	useEffect(() => {
		if (selectedProjectIds.length !== 1) return;

		const projectId = selectedProjectIds[0];
		if (!projectId) return;

		// Hämta datumintervall för relevanta rader
		const fetchRange = async () => {
			try {
				const params = new URLSearchParams({ projectId });
				const res = await fetch(`/api/invoice/project-date-range?${params.toString()}`, {
					headers: { 'Content-Type': 'application/json' },
				});

				if (!res.ok) {
					const message = await res.text().catch(() => '');
					console.error('project-date-range error', res.status, message);
					toast.error('Kunde inte hämta period automatiskt.', {
						description: 'Välj period manuellt för den här gången.',
					});
					return;
				}

				const data = await res.json();

				if (!data?.hasData || !data.from || !data.to) {
					toast.info('Inga godkända rader hittades för valt projekt ännu.', {
						description:
							'Välj period manuellt – när det finns godkända rader föreslår vi ett intervall automatiskt.',
					});
					return;
				}

				setPeriodStart(data.from);
				setPeriodEnd(data.to);

				toast.info('Vi har satt perioden automatiskt efter alla relevanta rader för projektet.', {
					description: `${data.from} till ${data.to}`,
				});
			} catch (error) {
				console.error('Failed to fetch project date range', error);
				toast.error('Kunde inte hämta period automatiskt.', {
					description: 'Kontrollera din uppkoppling och försök igen.',
				});
			}
		};

		void fetchRange();
	}, [selectedProjectIds.join(',')]);

	return (
		<div className='flex h-full flex-col bg-background dark:bg-black'>
			{/* Step Indicator */}
			<InvoiceStepIndicator currentStep={currentStep === 'select' ? 'select' : currentStep === 'approvals' ? 'approvals' : currentStep === 'preview' ? 'preview' : 'lock'} />

			{/* Landing / welcome section */}
			<InvoiceLanding role={roleForLanding} />

			{/* Step 1: Project & Period Filter */}
			<section
				id='invoice-step-1'
				className='mx-auto mb-8 mt-4 w-full max-w-5xl px-4 md:mt-2 md:px-6'
			>
				<InvoiceProjectFilter
					projects={projects}
					selectedProjectIds={selectedProjectIds}
					onProjectIdsChange={setSelectedProjectIds}
					periodStart={periodStart}
					onPeriodStartChange={setPeriodStart}
					periodEnd={periodEnd}
					onPeriodEndChange={setPeriodEnd}
					onFetchBasis={handleFetchBasis}
					isLoading={isLoadingGrouped}
					canFetch={canFetch}
				/>
			</section>

			<main className='mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-6 md:px-8'>
				{/* Step 2: Pending Approvals */}
				{currentStep === 'approvals' && hasFetchedBasis && (
					<InvoicePendingApprovals
						projectIds={selectedProjectIds}
						from={periodStart}
						to={periodEnd}
						canApprove={canApprove}
						onApprovalsComplete={handleApprovalsComplete}
					/>
				)}

				{/* Step 3: Invoice Preview */}
				{currentStep === 'preview' && (
					<>
						{isLoadingBasis || isFetchingBasis ? (
							<Card className='border-dashed'>
								<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
									<div className='mb-4 rounded-full bg-muted p-4'>
										<RefreshCw className='h-8 w-8 animate-spin text-muted-foreground' />
									</div>
									<h3 className='mb-2 text-lg font-semibold text-foreground'>Hämtar fakturaunderlag</h3>
									<p className='max-w-md text-sm text-muted-foreground'>
										Samlar ihop alla godkända poster för den valda perioden...
									</p>
								</CardContent>
							</Card>
						) : invoiceBasis && hasInvoiceLines ? (
							<>
								{/* Quick Actions */}
								<div className='flex flex-wrap items-center justify-end gap-3'>
									<Button
										variant='outline'
										onClick={() => {
											setCurrentStep('approvals');
											refetchGrouped();
										}}
									>
										<CheckCircle2 className='mr-2 h-4 w-4' />
										Öppna godkännanden
									</Button>
								</div>

								{/* Customer Information Section */}
								{(invoiceBasis.customer_snapshot || invoiceBasis.invoice_address_json) && (
									<Card>
										<CardHeader>
											<CardTitle className='text-lg'>Kundinformation</CardTitle>
										</CardHeader>
										<CardContent>
											<div className='grid gap-4 md:grid-cols-2'>
												<div className='space-y-3'>
													<div>
														<label className='text-sm font-semibold text-muted-foreground'>Kundnamn</label>
														<p className='text-base font-medium'>
															{(() => {
																if (
																	invoiceBasis.customer_snapshot &&
																	typeof invoiceBasis.customer_snapshot === 'object' &&
																	invoiceBasis.customer_snapshot !== null
																) {
																	const snap = invoiceBasis.customer_snapshot as {
																		name?: string;
																		company_name?: string;
																		first_name?: string;
																		last_name?: string;
																	};
																	const fromSnapshot =
																		snap.name ||
																		snap.company_name ||
																		[snap.first_name, snap.last_name].filter(Boolean).join(' ');
																	if (fromSnapshot) return fromSnapshot;
																}

																if (
																	invoiceBasis.invoice_address_json &&
																	typeof invoiceBasis.invoice_address_json === 'object'
																) {
																	const addr = invoiceBasis.invoice_address_json as { name?: string };
																	if (addr.name) return addr.name;
																}

																return 'Ingen kund kopplad';
															})()}
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
																{(invoiceBasis.invoice_address_json as { street?: string }).street && <p>{(invoiceBasis.invoice_address_json as { street?: string }).street}</p>}
																{(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).zip && (invoiceBasis.invoice_address_json as { zip?: string; city?: string }).city && (
																	<p>
																		{(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).zip} {(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).city}
																	</p>
																)}
																{(invoiceBasis.invoice_address_json as { country?: string }).country && (
																	<p>{(invoiceBasis.invoice_address_json as { country?: string }).country}</p>
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
																{(invoiceBasis.delivery_address_json as { street?: string }).street && <p>{(invoiceBasis.delivery_address_json as { street?: string }).street}</p>}
																{(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).zip && (invoiceBasis.delivery_address_json as { zip?: string; city?: string }).city && (
																	<p>
																		{(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).zip} {(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).city}
																	</p>
																)}
																{(invoiceBasis.delivery_address_json as { country?: string }).country && (
																	<p>{(invoiceBasis.delivery_address_json as { country?: string }).country}</p>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								{/* Fakturainfo Card */}
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
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
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
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
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
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
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
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
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
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Vår referens</label>
												<Input
													value={headerState.our_ref}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, our_ref: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Er referens</label>
												<Input
													value={headerState.your_ref}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, your_ref: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Valuta</label>
												<Input
													value={headerState.currency}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Kostnadsställe</label>
												<Input
													value={headerState.cost_center}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, cost_center: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Resultatenhet</label>
												<Input
													value={headerState.result_unit}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, result_unit: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
												<span className='text-sm font-medium text-muted-foreground'>Omvänd byggmoms</span>
												<Switch
													checked={headerState.reverse_charge_building}
													onCheckedChange={(checked) =>
														setHeaderState((state) => ({ ...state, reverse_charge_building: checked }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
												<span className='text-sm font-medium text-muted-foreground'>ROT/RUT flagga</span>
												<Switch
													checked={headerState.rot_rut_flag}
													onCheckedChange={(checked) =>
														setHeaderState((state) => ({ ...state, rot_rut_flag: checked }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
										</div>
										{canEdit && (
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
										)}
									</CardContent>
								</Card>

								{/* Line Items Card */}
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
														{canEdit && <th className='px-3 py-3'></th>}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
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
																			disabled={!canEdit}
																		/>
																	) : (
																		line.account || '–'
																	)}
																</td>
																<td className='px-3 py-3 text-right'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																<td className='px-3 py-3 text-right'>{amountIncVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																{canEdit && (
																	<td className='px-3 py-3 text-right'>
																		{isEditing ? (
																			<div className='flex justify-end gap-2'>
																				<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending || invoiceBasis.locked}>
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
																)}
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>

										{/* Diary and ÄTA Descriptions */}
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

								{/* Totals Card */}
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

								{/* Lock & Export Card */}
								<Card>
									<CardHeader>
										<CardTitle>Låsning & Export</CardTitle>
									</CardHeader>
									<CardContent className='space-y-4'>
										<p className='text-sm text-muted-foreground'>
											Ett fakturaunderlag måste låsas innan det kan exporteras eller skickas till Fortnox/Visma. När
											underlaget låses beräknas OCR och hash-signatur. Upplåsning kräver motivering och loggas.
										</p>
										<div className='flex flex-wrap gap-3'>
											{canLock && (
												<>
													<Button
														onClick={handleLock}
														disabled={invoiceBasis.locked || lockBasis.isPending || !invoiceBasis.lines_json?.lines?.length}
													>
														<Lock className="mr-2 h-4 w-4" />
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
												</>
											)}
											{(invoiceBasis.locked || userRole === 'finance') && (
												<>
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
														disabled={!invoiceBasis.locked}
													>
														<Download className="mr-2 h-4 w-4" />
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
														disabled={!invoiceBasis.locked}
													>
														<Download className="mr-2 h-4 w-4" />
														Ladda ner PDF
													</Button>
												</>
											)}
										</div>
									</CardContent>
								</Card>
							</>
						) : (
							<Card className='border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'>
								<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
									<div className='mb-4 rounded-full bg-amber-100 p-4 dark:bg-amber-900/30'>
										<Info className='h-8 w-8 text-amber-600 dark:text-amber-400' />
									</div>
									<h3 className='mb-2 text-lg font-semibold text-foreground'>Inget att fakturera ännu</h3>
									<p className='mb-6 max-w-md text-sm text-muted-foreground'>
										Det finns just nu inga godkända rader att fakturera för valt projekt och period. För att skapa ett underlag behöver du:
									</p>
									<div className='mb-6 grid max-w-md gap-2 text-left text-sm'>
										<div className='flex items-start gap-2'>
											<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground' />
											<span className='text-muted-foreground'>
												Godkänd tid, material, utlägg eller ÄTA-rader för perioden
											</span>
										</div>
										<div className='flex items-start gap-2'>
											<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground' />
											<span className='text-muted-foreground'>
												Dagboksposter om du vill inkludera fakturatext
											</span>
										</div>
									</div>
									<div className='flex flex-wrap items-center justify-center gap-3'>
										<Button variant='outline' onClick={() => refetchBasis()}>
											<RefreshCw className='mr-2 h-4 w-4' />
											Försök igen
										</Button>
										<Button
											variant='default'
											onClick={() => {
												setCurrentStep('approvals');
												refetchGrouped();
											}}
										>
											<CheckCircle2 className='mr-2 h-4 w-4' />
											Öppna godkännanden
										</Button>
									</div>
								</CardContent>
							</Card>
						)}
					</>
				)}
			</main>
		</div>
	);
}

