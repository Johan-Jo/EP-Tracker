'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	ArrowRight,
	CheckCircle2,
	Eye,
	HelpCircle,
	Lock,
	LockOpen,
	RefreshCw,
	Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ExportMenu } from './export-menu';
import { PeriodPicker } from './period-picker';
import { PayrollRulesForm } from './payroll-rules-form';
import { PayrollSalaryRates } from './payroll-salary-rates';
import { usePayrollBasis, PayrollBasisEntry } from './hooks/usePayrollBasis';

type FilterStatus = 'all' | 'locked' | 'unlocked';

type StepState = 'pending' | 'active' | 'done';

type StepDefinition = {
	number: number;
	label: string;
	description: string;
	state: StepState;
};

const isZeroHours = (h: number | null | undefined) => !h || Math.abs(h) < 1 / 60;

const fmtH = (value: number) => {
	const sign = value < 0 ? '-' : '';
	const abs = Math.abs(value);
	const hours = Math.floor(abs);
	const minutes = Math.round((abs - hours) * 60);
	return `${sign}${hours} h ${String(minutes).padStart(2, '0')} min`;
};

const fmtMoneySEK = (value: number | null | undefined) =>
	value == null
		? '–'
		: `${new Intl.NumberFormat('sv-SE', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
		  }).format(value)} SEK`;

const formatDate = (value: string) => new Date(value).toLocaleDateString('sv-SE');

const formatDateRange = (start: string, end: string) => `${formatDate(start)} – ${formatDate(end)}`;

export function PayrollBasisPage({ orgId }: { orgId: string }) {
	const makeStart = () => {
		const date = new Date();
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
	};

	const makeEnd = () => {
		const date = new Date();
		const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
		return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(
			lastDay.getDate(),
		).padStart(2, '0')}`;
	};

	const [period, setPeriod] = useState({ start: makeStart(), end: makeEnd() });
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
	const [selected, setSelected] = useState<Record<string, boolean>>({});

	const { data = [], isLoading, error, refetch, refresh, lock, exportFile } = usePayrollBasis(
		orgId,
		period.start,
		period.end,
	);

	useEffect(() => {
		setSelected((prev) => {
			const next: Record<string, boolean> = {};
			data.forEach((entry) => {
				if (prev[entry.id]) {
					next[entry.id] = true;
				}
			});
			const prevKeys = Object.keys(prev);
			const nextKeys = Object.keys(next);
			if (
				prevKeys.length === nextKeys.length &&
				prevKeys.every((key) => next[key])
			) {
				return prev;
			}
			return next;
		});
	}, [data]);

	const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

	const totalCount = data.length;
	const lockedCount = useMemo(() => data.filter((entry) => entry.locked).length, [data]);

	const filteredData = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		return data.filter((entry) => {
			const matchesSearch =
				term.length === 0 ||
				entry.person.full_name.toLowerCase().includes(term) ||
				entry.person.email.toLowerCase().includes(term);
			const matchesStatus =
				statusFilter === 'all'
					? true
					: statusFilter === 'locked'
					? entry.locked
					: !entry.locked;
			return matchesSearch && matchesStatus;
		});
	}, [data, searchTerm, statusFilter]);

	const filteredSelectedCount = useMemo(
		() => filteredData.filter((entry) => selected[entry.id]).length,
		[filteredData, selected],
	);

	const allFilteredSelected = filteredData.length > 0 && filteredSelectedCount === filteredData.length;

	const steps: StepDefinition[] = useMemo(() => {
		const hasCalculated = totalCount > 0;
		const hasLocked = lockedCount > 0;
		return [
			{
				number: 1,
				label: 'Beräkna',
				description: 'Välj period och kör beräkning',
				state: hasCalculated ? 'done' : 'active',
			},
			{
				number: 2,
				label: 'Granska & lås',
				description: 'Lås poster som är klara',
				state: hasCalculated ? (hasLocked ? 'done' : 'active') : 'pending',
			},
			{
				number: 3,
				label: 'Exportera',
				description: 'Exportera CSV / PAXml / PDF',
				state: lockedCount > 0 ? 'active' : 'pending',
			},
		];
	}, [lockedCount, totalCount]);

	const doRefresh = async () => {
		try {
			const result = await refresh();
			toast.success(result?.message ?? 'Löneunderlag beräknat');
			await refetch();
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : 'Kunde inte beräkna');
		}
	};

	const doLock = async (value: boolean, ids?: string[]) => {
		const target = ids && ids.length > 0 ? ids : data.map((entry) => entry.id);
		if (target.length === 0) {
			toast.warning('Inga poster valda');
			return;
		}

		try {
			await lock(target, value);
			toast.success(value ? 'Poster låsta' : 'Poster upplåsta');
			await refetch();
			if (value) {
				setSelected((prev) => {
					const next = { ...prev };
					target.forEach((id) => {
						delete next[id];
					});
					return next;
				});
			}
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : 'Kunde inte uppdatera låsstatus');
		}
	};

	const handleExport = async (format: 'csv' | 'paxml' | 'pdf', scope: 'all' | 'locked' | 'selected') => {
		if (format === 'pdf' && scope !== 'locked') {
			scope = 'locked';
		}

		if (scope === 'selected' && selectedIds.length === 0) {
			toast.warning('Markera poster att exportera');
			return;
		}

		try {
			const blob = await exportFile(format, scope, selectedIds);
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			const base = `loneunderlag_${period.start}_${period.end}`;
			anchor.download = `${base}.${format === 'paxml' ? 'xml' : format}`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);
			toast.success('Export klar');
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : 'Export misslyckades');
		}
	};

	const toggleAllFiltered = (checked: boolean) => {
		setSelected((prev) => {
			if (checked) {
				const next = { ...prev };
				filteredData.forEach((entry) => {
					next[entry.id] = true;
				});
				return next;
			}

			const next = { ...prev };
			filteredData.forEach((entry) => {
				delete next[entry.id];
			});
			return next;
		});
	};

	const toggleSelection = (id: string) => {
		setSelected((prev) => {
			const next = { ...prev };
			if (next[id]) {
				delete next[id];
			} else {
				next[id] = true;
			}
			return next;
		});
	};

	const errorMessage = error instanceof Error ? error.message : error ? 'Kunde inte ladda löneunderlag' : '';

	return (
		<div className='flex-1 min-h-full w-full overflow-auto bg-black pb-24 transition-colors dark:bg-black'>
			<main className='mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8'>
				<section className='mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>Löneunderlag</h1>
						<p className='mt-1 text-sm text-muted-foreground'>1) Beräkna period • 2) Granska & lås • 3) Exportera</p>
					</div>
					<div className='flex flex-wrap gap-2'>
						<Button
							variant='ghost'
							size='sm'
							className='min-h-[44px]'
							onClick={() => window.open('/dashboard/help#payroll', '_blank')}
						>
							<HelpCircle className='mr-2 h-4 w-4' /> Hjälp
						</Button>
						<Button
							variant='outline'
							size='sm'
							className='min-h-[44px]'
							onClick={() =>
								(window.location.href = `/dashboard/payroll/preview?start=${period.start}&end=${period.end}`)
							}
						>
							<Eye className='mr-2 h-4 w-4' /> Förhandsgranska PDF
						</Button>
					</div>
				</section>

				<Tabs defaultValue='basis' className='space-y-6'>
					<TabsList>
						<TabsTrigger value='basis'>Guidat flöde</TabsTrigger>
						<TabsTrigger value='rules'>Löneregler</TabsTrigger>
					</TabsList>

					<TabsContent value='basis' className='space-y-6'>
						<StepBand steps={steps} />

						<Card>
							<CardContent className='flex flex-col gap-4 pt-4 md:flex-row md:items-end md:justify-between'>
								<div className='flex-1 space-y-3'>
									<PeriodPicker value={period} onChange={setPeriod} />
									<p className='text-xs text-muted-foreground'>
										PDF innehåller alltid endast <b>låsta</b> poster. CSV/PAXml kan exportera <i>Alla</i>, <i>Låsta</i> eller{' '}
										<i>Markerade</i>.
									</p>
								</div>
								<div className='flex flex-col gap-2 md:flex-row'>
									<Button onClick={doRefresh} size='sm' className='min-h-[44px]'>
										<RefreshCw className='mr-2 h-4 w-4' /> Beräkna
									</Button>
									<ExportMenu onExport={handleExport} />
								</div>
							</CardContent>
						</Card>

						{isLoading && (
							<Card>
								<CardContent className='space-y-4 pt-6'>
									<div className='h-4 w-32 animate-pulse rounded bg-muted' />
									<div className='h-32 animate-pulse rounded bg-muted' />
								</CardContent>
							</Card>
						)}

						{!isLoading && error && (
							<div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
								<p className='font-semibold'>Ett fel inträffade</p>
								<p className='mt-1'>{errorMessage}</p>
								<Button variant='link' className='mt-3 h-auto p-0' onClick={() => refetch()}>
									Försök igen
								</Button>
							</div>
						)}

						{!isLoading && !error && totalCount === 0 && (
							<Card>
								<CardContent className='space-y-3 pt-6 text-sm text-muted-foreground'>
									<p className='font-medium text-foreground'>Inga poster för vald period.</p>
									<p>Klicka <b>Beräkna</b> för att skapa löneunderlag eller justera perioden.</p>
									<Button size='sm' className='min-h-[44px]' onClick={doRefresh}>
										<RefreshCw className='mr-2 h-4 w-4' /> Beräkna löneunderlag
									</Button>
								</CardContent>
							</Card>
						)}

						{!isLoading && !error && totalCount > 0 && (
							<Card>
								<CardContent className='space-y-4 pt-4'>
									<Toolbar
										total={totalCount}
										lockedCount={lockedCount}
										selectedCount={selectedIds.length}
										filteredCount={filteredData.length}
										search={searchTerm}
										onSearchChange={setSearchTerm}
										statusFilter={statusFilter}
										onStatusFilterChange={(value) => setStatusFilter(value)}
										onLockAll={() => doLock(true)}
										onUnlockAll={() => doLock(false)}
										onLockSelected={() => doLock(true, selectedIds)}
										onUnlockSelected={() => doLock(false, selectedIds)}
									/>

									<div className='space-y-3 sm:hidden'>
										{filteredData.map((row) => {
											const obHours = row.ob_hours_actual ?? row.ob_hours ?? 0;
											return (
											<article
												key={row.id}
												className='rounded-2xl border border-white/10 bg-white/5 p-3 shadow-sm dark:border-white/5 dark:bg-white/5'
											>
												<div className='flex items-start justify-between gap-3'>
													<div className='min-w-0'>
														<div className='flex items-center gap-2'>
															<input
																type='checkbox'
																checked={!!selected[row.id]}
																onChange={() => toggleSelection(row.id)}
																className='mt-0.5 shrink-0 accent-orange-500'
																aria-label={`Markera ${row.person.full_name}`}
															/>
															<h3 className='truncate text-base font-semibold'>{row.person.full_name}</h3>
														</div>
														<div className='mt-0.5 text-[11px] text-slate-400 tabular'>
															{formatDateRange(row.period_start, row.period_end)}
														</div>

														<div className='mt-1 flex flex-wrap gap-1 text-[11px] tabular'>
															{!isZeroHours(row.hours_overtime) && (
																<span className='rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300'>ÖT {fmtH(row.hours_overtime)}</span>
															)}
															{!isZeroHours(obHours) && (
																<span className='rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-300'>OB {fmtH(obHours)}</span>
															)}
															{!isZeroHours(row.hours_norm) && (
																<span className='rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300'>
																	Norm {fmtH(row.hours_norm)}
																</span>
															)}
														</div>
													</div>

													<button
														onClick={() => doLock(!row.locked, [row.id])}
														className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
															row.locked ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
														}`}
														title={row.locked ? 'Lås upp' : 'Lås'}
													>
														{row.locked ? 'Låst' : 'Öppen'}
													</button>
												</div>

												<div className='mt-3 grid grid-cols-2 gap-x-3 gap-y-1 tabular'>
													<div className='text-[12px] text-slate-400'>Totalt</div>
													<div className='text-right text-[15px] font-semibold'>{fmtH(row.total_hours)}</div>

													<div className='text-[12px] text-slate-400'>Bruttolön</div>
													<div className='text-right text-[15px] font-semibold'>{fmtMoneySEK(row.gross_salary_sek)}</div>
												</div>

												{(!isZeroHours(row.hours_norm) || !isZeroHours(row.hours_overtime) || !isZeroHours(obHours)) && (
													<div className='mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular text-[13px]'>
														{!isZeroHours(row.hours_norm) && (
															<>
																<div className='text-slate-400'>Norm</div>
																<div className='text-right'>{fmtH(row.hours_norm)}</div>
															</>
														)}
														{!isZeroHours(row.hours_overtime) && (
															<>
																<div className='text-slate-400'>Övertid</div>
																<div className='text-right'>{fmtH(row.hours_overtime)}</div>
															</>
														)}
														{!isZeroHours(obHours) && (
															<>
																<div className='text-slate-400'>OB</div>
																<div className='text-right'>{fmtH(obHours)}</div>
															</>
														)}
													</div>
												)}

												<div className='mt-3 flex items-center justify-end gap-2 text-[13px]'>
													<button
														onClick={() =>
															(window.location.href = `/dashboard/payroll/preview?start=${period.start}&end=${period.end}&focus=${row.person_id}`)
														}
														className='underline decoration-slate-500 hover:decoration-orange-400'
													>
														Förhandsgranska PDF
													</button>
													<span className='text-slate-500'>•</span>
													<button
														onClick={() => toggleSelection(row.id)}
														className='underline decoration-slate-500 hover:decoration-orange-400'
													>
														{selected[row.id] ? 'Avmarkera' : 'Markera'}
													</button>
												</div>
											</article>
										);
										})}

										{filteredData.length > 0 && (
											<div className='sticky-actions safe-bottom mt-3 -mx-6 px-6 py-3'>
												<div className='flex items-center gap-2'>
													<Button
														onClick={() => doLock(true, selectedIds)}
														size='sm'
														className='min-h-[44px] grow'
														disabled={!selectedIds.length}
													>
														Lås markerade
													</Button>
													<Button
														variant='secondary'
														onClick={() => doLock(false, selectedIds)}
														size='sm'
														className='min-h-[44px]'
														disabled={!selectedIds.length}
													>
														Lås upp
													</Button>
												</div>
												<p className='mt-1 text-[11px] text-slate-500 dark:text-slate-400'>
													PDF exporterar endast <b>låsta</b> poster
												</p>
											</div>
										)}
									</div>

									<div className='hidden sm:block'>
										<Table
											data={filteredData}
											selected={selected}
											selectedCount={filteredSelectedCount}
											allSelected={allFilteredSelected}
											toggleAll={toggleAllFiltered}
											toggleSelection={toggleSelection}
										/>
									</div>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value='rules' className='space-y-6'>
						<PayrollSalaryRates />
						<PayrollRulesForm />
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

function StepBand({ steps }: { steps: StepDefinition[] }) {
	return (
		<div className='flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between'>
			{steps.map((step, index) => {
				const circleClasses =
					step.state === 'done'
						? 'border-emerald-500 bg-emerald-500 text-white'
						: step.state === 'active'
						? 'border-primary text-primary'
						: 'border-muted-foreground/40 text-muted-foreground';
				const labelClasses =
					step.state === 'done'
						? 'text-emerald-600'
						: step.state === 'active'
						? 'text-foreground'
						: 'text-muted-foreground';
				return (
					<div key={step.number} className='flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3'>
						<div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${circleClasses}`}>
							{step.state === 'done' ? <CheckCircle2 className='h-5 w-5' /> : <span className='text-sm font-semibold'>{step.number}</span>}
						</div>
						<div>
							<p className={`text-sm font-semibold ${labelClasses}`}>{`${step.number}. ${step.label}`}</p>
							<p className='text-xs text-muted-foreground'>{step.description}</p>
						</div>
						{index < steps.length - 1 && <ArrowRight className='hidden h-4 w-4 text-muted-foreground/70 md:block' />}
					</div>
				);
			})}
		</div>
	);
}

type ToolbarProps = {
	total: number;
	lockedCount: number;
	selectedCount: number;
	filteredCount: number;
	search: string;
	onSearchChange: (value: string) => void;
	statusFilter: FilterStatus;
	onStatusFilterChange: (value: FilterStatus) => void;
	onLockAll: () => void;
	onUnlockAll: () => void;
	onLockSelected: () => void;
	onUnlockSelected: () => void;
};

function Toolbar({
	total,
	lockedCount,
	selectedCount,
	filteredCount,
	search,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	onLockAll,
	onUnlockAll,
	onLockSelected,
	onUnlockSelected,
}: ToolbarProps) {
	return (
		<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
			<div className='space-y-1 text-sm text-muted-foreground'>
				<p>
					Poster: <b>{total}</b> • Låsta: <b>{lockedCount}</b> • Markerade: <b>{selectedCount}</b>
				</p>
				{filteredCount !== total && (
					<p>
						Filter aktivt: visar <b>{filteredCount}</b> poster
					</p>
				)}
			</div>
			<div className='flex flex-col gap-2 md:flex-row md:items-center md:gap-3'>
				<div className='relative md:w-64'>
					<Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder='Sök namn eller e-post'
						className='min-h-[44px] pl-10'
					/>
				</div>
				<Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as FilterStatus)}>
					<SelectTrigger className='min-h-[44px] md:w-44'>
						<SelectValue placeholder='Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='all'>Alla poster</SelectItem>
						<SelectItem value='locked'>Endast låsta</SelectItem>
						<SelectItem value='unlocked'>Endast olåsta</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className='flex flex-wrap gap-2'>
				<Button size='sm' variant='secondary' className='min-h-[44px]' onClick={onLockAll}>
					<Lock className='mr-2 h-4 w-4' /> Lås alla
				</Button>
				<Button size='sm' variant='ghost' className='min-h-[44px]' onClick={onUnlockAll}>
					<LockOpen className='mr-2 h-4 w-4' /> Lås upp alla
				</Button>
				<Button size='sm' variant='outline' className='min-h-[44px]' onClick={onLockSelected} disabled={selectedCount === 0}>
					<Lock className='mr-2 h-4 w-4' /> Lås markerade
				</Button>
				<Button size='sm' variant='outline' className='min-h-[44px]' onClick={onUnlockSelected} disabled={selectedCount === 0}>
					<LockOpen className='mr-2 h-4 w-4' /> Lås upp markerade
				</Button>
			</div>
		</div>
	);
}

type TableProps = {
	data: PayrollBasisEntry[];
	selected: Record<string, boolean>;
	selectedCount: number;
	allSelected: boolean;
	toggleAll: (checked: boolean) => void;
	toggleSelection: (id: string) => void;
};

function Table({ data, selected, selectedCount, allSelected, toggleAll, toggleSelection }: TableProps) {
	const headerCheckboxRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (headerCheckboxRef.current) {
			headerCheckboxRef.current.indeterminate = selectedCount > 0 && !allSelected;
		}
	}, [allSelected, selectedCount]);

	return (
		<div className='overflow-x-auto'>
			<table className='w-full text-sm tabular'>
				<thead>
					<tr className='text-left text-xs uppercase tracking-wide text-muted-foreground'>
						<th className='w-10'>
							<input
								type='checkbox'
								ref={headerCheckboxRef}
								checked={allSelected && data.length > 0}
								onChange={(event) => toggleAll(event.target.checked)}
								aria-label='Markera alla'
							/>
						</th>
						<th>Namn</th>
						<th>Norm</th>
						<th>ÖT</th>
						<th>OB</th>
						<th>Rast</th>
						<th>Totalt</th>
						<th className='text-right'>Brutto (SEK)</th>
						<th className='text-right'>Status</th>
					</tr>
				</thead>
				<tbody>
					{data.map((row) => (
						<tr key={row.id} className='border-b last:border-0'>
							<td className='py-2'>
								<input
									type='checkbox'
									checked={!!selected[row.id]}
									onChange={() => toggleSelection(row.id)}
									aria-label={`Markera ${row.person.full_name}`}
								/>
							</td>
							<td className='whitespace-nowrap py-2 pr-4 font-medium' title={row.person.full_name}>
								{row.person.full_name}
							</td>
							<td className='whitespace-nowrap py-2 pr-4 text-slate-500'>
								{isZeroHours(row.hours_norm) ? '–' : fmtH(row.hours_norm)}
							</td>
							<td className='whitespace-nowrap py-2 pr-4 text-slate-500'>
								{isZeroHours(row.hours_overtime) ? '–' : fmtH(row.hours_overtime)}
							</td>
							<td className='whitespace-nowrap py-2 pr-4 text-slate-500'>
								{isZeroHours((row.ob_hours_actual ?? row.ob_hours) ?? 0)
									? '–'
									: fmtH((row.ob_hours_actual ?? row.ob_hours) ?? 0)}
							</td>
							<td className='whitespace-nowrap py-2 pr-4 text-slate-500'>
								{isZeroHours(row.break_hours) ? '–' : fmtH(row.break_hours)}
							</td>
							<td className='whitespace-nowrap py-2 pr-4 font-semibold'>{fmtH(row.total_hours)}</td>
							<td className='whitespace-nowrap py-2 pr-4 text-right font-semibold'>{fmtMoneySEK(row.gross_salary_sek)}</td>
							<td className='whitespace-nowrap py-2 text-right'>
								{row.locked ? (
									<span className='inline-flex items-center gap-1 text-emerald-600'>
										<Lock className='h-3.5 w-3.5' /> Låst
									</span>
								) : (
									<span className='inline-flex items-center gap-1 text-amber-600'>
										<LockOpen className='h-3.5 w-3.5' /> Öppen
									</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

