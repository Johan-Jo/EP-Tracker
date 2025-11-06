'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Loader2, RefreshCw, ArrowLeft, FileText, Users, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface PayrollPreviewPageProps {
	orgId: string;
	initialStart?: string;
	initialEnd?: string;
}

interface PayrollBasisEntry {
	id: string;
	person_id: string;
	period_start: string;
	period_end: string;
	hours_norm: number;
	hours_overtime: number;
	ob_hours: number;
	break_hours: number;
	total_hours: number;
	gross_salary_sek: number | null;
	locked: boolean;
	locked_by: string | null;
	locked_at: string | null;
	person: {
		id: string;
		full_name: string;
		email: string;
	};
}

export function PayrollPreviewPage({ orgId, initialStart, initialEnd }: PayrollPreviewPageProps) {
	const router = useRouter();
	const [periodStart, setPeriodStart] = useState(() => {
		if (initialStart) return initialStart;
		// Default to first day of current month
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
	});
	const [periodEnd, setPeriodEnd] = useState(() => {
		if (initialEnd) return initialEnd;
		// Default to last day of current month
		const now = new Date();
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
	});

	const { data: payrollBasis, isLoading, error } = useQuery<PayrollBasisEntry[]>({
		queryKey: ['payroll-basis-preview', orgId, periodStart, periodEnd],
		queryFn: async () => {
			const response = await fetch(`/api/payroll/basis?start=${periodStart}&end=${periodEnd}`);
			if (!response.ok) {
				throw new Error('Failed to fetch payroll basis');
			}
			const data = await response.json();
			return data.payroll_basis || [];
		},
		staleTime: 30 * 1000, // 30 seconds
	});

	const formatHours = (hours: number): string => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h}h ${m}min`;
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString('sv-SE');
	};

	// Calculate totals
	const totals = payrollBasis?.reduce(
		(acc, entry) => ({
			hours_norm: acc.hours_norm + entry.hours_norm,
			hours_overtime: acc.hours_overtime + entry.hours_overtime,
			ob_hours: acc.ob_hours + entry.ob_hours,
			break_hours: acc.break_hours + entry.break_hours,
			total_hours: acc.total_hours + entry.total_hours,
			gross_salary_sek: acc.gross_salary_sek + (entry.gross_salary_sek || 0),
			people: acc.people + 1,
		}),
		{ hours_norm: 0, hours_overtime: 0, ob_hours: 0, break_hours: 0, total_hours: 0, gross_salary_sek: 0, people: 0 }
	) || { hours_norm: 0, hours_overtime: 0, ob_hours: 0, break_hours: 0, total_hours: 0, gross_salary_sek: 0, people: 0 };

	const handleExport = async () => {
		const url = `/api/payroll/basis/export?start=${periodStart}&end=${periodEnd}`;
		window.open(url, '_blank');
	};

	// Group by person
	const groupedByPerson = payrollBasis?.reduce((acc, entry) => {
		const personId = entry.person_id;
		if (!acc[personId]) {
			acc[personId] = {
				person: entry.person,
				entries: [],
				totals: {
					hours_norm: 0,
					hours_overtime: 0,
					ob_hours: 0,
					break_hours: 0,
					total_hours: 0,
					gross_salary_sek: 0,
				},
			};
		}
		acc[personId].entries.push(entry);
		acc[personId].totals.hours_norm += entry.hours_norm;
		acc[personId].totals.hours_overtime += entry.hours_overtime;
		acc[personId].totals.ob_hours += entry.ob_hours;
		acc[personId].totals.break_hours += entry.break_hours;
		acc[personId].totals.total_hours += entry.total_hours;
		acc[personId].totals.gross_salary_sek += entry.gross_salary_sek || 0;
		return acc;
	}, {} as Record<string, { person: PayrollBasisEntry['person']; entries: PayrollBasisEntry[]; totals: typeof totals }>);

	return (
		<div className='flex-1 overflow-auto'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => router.push('/dashboard/payroll')}
								className='flex items-center gap-2'
							>
								<ArrowLeft className='w-4 h-4' />
								Tillbaka
							</Button>
							<div>
								<h1 className='text-3xl font-bold tracking-tight'>Förhandsgranska löner</h1>
								<p className='text-muted-foreground mt-1'>
									Översikt över löneunderlag per person och period
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2'>
							<Button
								onClick={handleExport}
								variant='outline'
								className='flex items-center gap-2'
							>
								<Download className='w-4 h-4' />
								Exportera CSV
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-7xl mx-auto'>
				{/* Period Selector */}
				<Card className='mb-6'>
					<CardHeader>
						<CardTitle>Välj period</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='period-start'>Från datum</Label>
								<Input
									id='period-start'
									type='date'
									value={periodStart}
									onChange={(e) => setPeriodStart(e.target.value)}
								/>
							</div>
							<div>
								<Label htmlFor='period-end'>Till datum</Label>
								<Input
									id='period-end'
									type='date'
									value={periodEnd}
									onChange={(e) => setPeriodEnd(e.target.value)}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Loading State */}
				{isLoading ? (
					<Card>
						<CardContent className='py-12 text-center'>
							<Loader2 className='w-8 h-8 animate-spin mx-auto text-muted-foreground' />
							<p className='text-muted-foreground mt-4'>Laddar löneunderlag...</p>
						</CardContent>
					</Card>
				) : error ? (
					<Card>
						<CardContent className='py-12 text-center'>
							<p className='text-destructive'>Kunde inte ladda löneunderlag</p>
							<p className='text-sm text-muted-foreground mt-2'>
								{(error as Error).message}
							</p>
						</CardContent>
					</Card>
				) : !payrollBasis || payrollBasis.length === 0 ? (
					<Card>
						<CardContent className='py-12 text-center'>
							<Calendar className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
							<p className='text-muted-foreground'>Inga löneunderlag hittades för denna period</p>
							<p className='text-sm text-muted-foreground mt-2'>
								Klicka på "Tillbaka" och beräkna löneunderlag först.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className='space-y-6'>
						{/* Summary Cards */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
							<Card>
								<CardHeader className='pb-3'>
									<CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
										<Users className='w-4 h-4' />
										Antal personer
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{totals.people}</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className='pb-3'>
									<CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
										<Clock className='w-4 h-4' />
										Totalt timmar
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{formatHours(totals.total_hours)}</div>
									<div className='text-xs text-muted-foreground mt-1'>
										Normaltid: {formatHours(totals.hours_norm)} • Övertid: {formatHours(totals.hours_overtime)}
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className='pb-3'>
									<CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
										<DollarSign className='w-4 h-4' />
										OB-timmar
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{formatHours(totals.ob_hours)}</div>
									<div className='text-xs text-muted-foreground mt-1'>
										Natt/helg/helgdag
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className='pb-3'>
									<CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
										<Clock className='w-4 h-4' />
										Rasttimmar
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold'>{formatHours(totals.break_hours)}</div>
									<div className='text-xs text-muted-foreground mt-1'>
										Automatiska rastar
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className='pb-3'>
									<CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
										<DollarSign className='w-4 h-4' />
										Total bruttolön
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-2xl font-bold text-green-600'>
										{totals.gross_salary_sek > 0
											? `${totals.gross_salary_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
											: 'Ej angiven'}
									</div>
									<div className='text-xs text-muted-foreground mt-1'>
										Beräknad från timmar
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Preview Table */}
						<Card>
							<CardHeader>
								<CardTitle className='flex items-center gap-2'>
									<FileText className='w-5 h-5' />
									Löneunderlag per person
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='overflow-x-auto'>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Person</TableHead>
												<TableHead>E-post</TableHead>
												<TableHead>Period</TableHead>
												<TableHead className='text-right'>Normaltid</TableHead>
												<TableHead className='text-right'>Övertid</TableHead>
												<TableHead className='text-right'>OB-timmar</TableHead>
												<TableHead className='text-right'>Rast</TableHead>
												<TableHead className='text-right'>Totalt</TableHead>
												<TableHead className='text-right'>Bruttolön</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{groupedByPerson &&
												Object.values(groupedByPerson).map((group) => (
													<TableRow key={group.person.id}>
														<TableCell className='font-medium'>{group.person.full_name}</TableCell>
														<TableCell className='text-muted-foreground'>{group.person.email}</TableCell>
														<TableCell>
															<div className='text-sm'>
																{formatDate(group.entries[0]?.period_start || '')} -{' '}
																{formatDate(group.entries[0]?.period_end || '')}
																{group.entries.length > 1 && (
																	<Badge variant='secondary' className='ml-2'>
																		{group.entries.length} perioder
																	</Badge>
																)}
															</div>
														</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.hours_norm)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.hours_overtime)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.ob_hours)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.break_hours)}</TableCell>
														<TableCell className='text-right font-semibold'>
															{formatHours(group.totals.total_hours)}
														</TableCell>
														<TableCell className='text-right font-semibold text-green-600'>
															{group.totals.gross_salary_sek > 0
																? `${group.totals.gross_salary_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
																: 'Ej angiven'}
														</TableCell>
														<TableCell>
															{group.entries.every((e) => e.locked) ? (
																<Badge variant='default' className='bg-green-600'>
																	Låst
																</Badge>
															) : (
																<Badge variant='secondary'>Öppen</Badge>
															)}
														</TableCell>
													</TableRow>
												))}
											{/* Totals Row */}
											{payrollBasis && payrollBasis.length > 0 && (
												<TableRow className='bg-muted/50 font-semibold'>
													<TableCell colSpan={3} className='font-bold'>
														TOTALT
													</TableCell>
													<TableCell className='text-right'>{formatHours(totals.hours_norm)}</TableCell>
													<TableCell className='text-right'>{formatHours(totals.hours_overtime)}</TableCell>
													<TableCell className='text-right'>{formatHours(totals.ob_hours)}</TableCell>
													<TableCell className='text-right'>{formatHours(totals.break_hours)}</TableCell>
													<TableCell className='text-right'>{formatHours(totals.total_hours)}</TableCell>
													<TableCell className='text-right font-bold text-green-600'>
														{totals.gross_salary_sek > 0
															? `${totals.gross_salary_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
															: '-'}
													</TableCell>
													<TableCell></TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</div>
							</CardContent>
						</Card>

						{/* Detailed View per Person */}
						{groupedByPerson &&
							Object.values(groupedByPerson).map((group) => (
								<Card key={group.person.id}>
									<CardHeader>
										<CardTitle className='text-lg'>
											{group.person.full_name} ({group.person.email})
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className='overflow-x-auto'>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Period Start</TableHead>
														<TableHead>Period Slut</TableHead>
														<TableHead className='text-right'>Normaltid</TableHead>
														<TableHead className='text-right'>Övertid</TableHead>
														<TableHead className='text-right'>OB-timmar</TableHead>
														<TableHead className='text-right'>Rast</TableHead>
														<TableHead className='text-right'>Totalt</TableHead>
														<TableHead className='text-right'>Bruttolön</TableHead>
														<TableHead>Status</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{group.entries.map((entry) => (
														<TableRow key={entry.id}>
															<TableCell>{formatDate(entry.period_start)}</TableCell>
															<TableCell>{formatDate(entry.period_end)}</TableCell>
															<TableCell className='text-right'>{formatHours(entry.hours_norm)}</TableCell>
															<TableCell className='text-right'>{formatHours(entry.hours_overtime)}</TableCell>
															<TableCell className='text-right'>{formatHours(entry.ob_hours)}</TableCell>
															<TableCell className='text-right'>{formatHours(entry.break_hours)}</TableCell>
															<TableCell className='text-right font-semibold'>
																{formatHours(entry.total_hours)}
															</TableCell>
															<TableCell className='text-right font-semibold text-green-600'>
																{entry.gross_salary_sek !== null && entry.gross_salary_sek !== undefined && entry.gross_salary_sek > 0
																	? `${entry.gross_salary_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
																	: 'Ej angiven'}
															</TableCell>
															<TableCell>
																{entry.locked ? (
																	<Badge variant='default' className='bg-green-600'>
																		Låst
																	</Badge>
																) : (
																	<Badge variant='secondary'>Öppen</Badge>
																)}
															</TableCell>
														</TableRow>
													))}
													{/* Person Total */}
													<TableRow className='bg-muted/30 font-semibold'>
														<TableCell colSpan={2} className='font-bold'>
															Totalt för {group.person.full_name}
														</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.hours_norm)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.hours_overtime)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.ob_hours)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.break_hours)}</TableCell>
														<TableCell className='text-right'>{formatHours(group.totals.total_hours)}</TableCell>
														<TableCell className='text-right font-bold text-green-600'>
															{group.totals.gross_salary_sek > 0
																? `${group.totals.gross_salary_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
																: '-'}
														</TableCell>
														<TableCell></TableCell>
													</TableRow>
												</TableBody>
											</Table>
										</div>
									</CardContent>
								</Card>
							))}
					</div>
				)}
			</main>
		</div>
	);
}

