'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Download, Lock, Loader2, RefreshCw, LockOpen, HelpCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollRulesForm } from './payroll-rules-form';
import { PayrollSalaryRates } from './payroll-salary-rates';

interface PayrollBasisPageProps {
	orgId: string;
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

export function PayrollBasisPage({ orgId }: PayrollBasisPageProps) {
	const [periodStart, setPeriodStart] = useState(() => {
		// Default to first day of current month
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
	});
	const [periodEnd, setPeriodEnd] = useState(() => {
		// Default to last day of current month
		const now = new Date();
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
	});

	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lockingEntryIds, setLockingEntryIds] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const { data: payrollBasis, isLoading, error, refetch } = useQuery<PayrollBasisEntry[]>({
		queryKey: ['payroll-basis', orgId, periodStart, periodEnd],
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

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			const response = await fetch('/api/payroll/basis/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start: periodStart,
					end: periodEnd,
				}),
			});

			// Check if response is ok and try to parse JSON
			let result;
			const contentType = response.headers.get('content-type');
			
			if (contentType && contentType.includes('application/json')) {
				try {
					result = await response.json();
				} catch (parseError) {
					console.error('Failed to parse JSON response:', parseError);
					throw new Error(`Kunde inte läsa svaret från servern. Status: ${response.status} ${response.statusText}`);
				}
			} else {
				// Non-JSON response - read as text
				const text = await response.text();
				console.error('Non-JSON response:', text);
				throw new Error(`Serverfel (${response.status}): ${text.substring(0, 200)}`);
			}

			if (!response.ok) {
				const errorMessage = result.details 
					? `${result.error || 'Fel'}: ${result.details}`
					: result.error || `Serverfel (${response.status})`;
				throw new Error(errorMessage);
			}
			
			// Show warning if no data found
			if (result.warning) {
				alert(result.message || 'Ingen data hittades för denna period');
			} else {
				// Show success message
				alert(result.message || 'Löneunderlag beräknat framgångsrikt');
			}

			// Refetch data after refresh
			await refetch();
		} catch (error) {
			console.error('Error refreshing payroll basis:', error);
			const errorMessage = error instanceof Error 
				? error.message 
				: 'Kunde inte beräkna löneunderlag';
			alert(`Fel: ${errorMessage}\n\nKontrollera konsolen för mer information.`);
		} finally {
			setIsRefreshing(false);
		}
	};

	const formatHours = (hours: number): string => {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h}h ${m}min`;
	};

	const handleLock = async (entryId: string, lock: boolean) => {
		setLockingEntryIds((prev) => new Set(prev).add(entryId));
		try {
			const response = await fetch('/api/payroll/basis/lock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					entry_ids: [entryId],
					lock: lock,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update lock status');
			}

			// Refetch data after lock/unlock
			await refetch();
		} catch (error) {
			console.error('Error locking/unlocking payroll basis:', error);
			alert(error instanceof Error ? error.message : 'Kunde inte uppdatera låsstatus');
		} finally {
			setLockingEntryIds((prev) => {
				const next = new Set(prev);
				next.delete(entryId);
				return next;
			});
		}
	};

	const handleExport = async (format: 'csv' | 'pdf' = 'csv') => {
		try {
			const lockedOnly = format === 'pdf'; // PDF should only export locked entries
			const url = `/api/payroll/basis/export?start=${periodStart}&end=${periodEnd}&format=${format}&locked_only=${lockedOnly}`;

			const response = await fetch(url);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to export payroll basis');
			}

			// Download file
			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = downloadUrl;
			a.download = `loneunderlag_${periodStart}_${periodEnd}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error('Error exporting payroll basis:', error);
			alert(error instanceof Error ? error.message : 'Kunde inte exportera löneunderlag');
		}
	};

	return (
		<div className='flex-1 overflow-auto'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Löneunderlag</h1>
							<p className='text-muted-foreground mt-1'>
								Visa och hantera löneunderlag per person och period
							</p>
						</div>
						<div className='flex items-center gap-2'>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => window.open('/dashboard/help#payroll', '_blank')}
								className='flex items-center gap-2'
								title='Hjälp om löneunderlag'
							>
								<HelpCircle className='w-4 h-4' />
								<span className='hidden sm:inline'>Hjälp</span>
							</Button>
							<Button
								onClick={() => window.location.href = `/dashboard/payroll/preview?start=${periodStart}&end=${periodEnd}`}
								variant='outline'
								className='flex items-center gap-2'
							>
								<Eye className='w-4 h-4' />
								Förhandsgranska
							</Button>
							<Button
								onClick={() => handleExport('csv')}
								variant='outline'
								className='flex items-center gap-2'
							>
								<Download className='w-4 h-4' />
								Exportera CSV
							</Button>
							<Button
								onClick={handleRefresh}
								disabled={isRefreshing}
								variant='outline'
								className='flex items-center gap-2'
							>
								{isRefreshing ? (
									<Loader2 className='w-4 h-4 animate-spin' />
								) : (
									<RefreshCw className='w-4 h-4' />
								)}
								Beräkna om
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-7xl mx-auto'>
				<Tabs defaultValue='basis' className='space-y-6'>
					<TabsList>
						<TabsTrigger value='basis'>Löneunderlag</TabsTrigger>
						<TabsTrigger value='rules'>Löneregler</TabsTrigger>
					</TabsList>

					{/* Löneunderlag Tab */}
					<TabsContent value='basis' className='space-y-6'>
						{/* Period Selector */}
						<Card>
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

				{/* Payroll Basis List */}
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
								Löneunderlag beräknas från närvaroregistreringar och tidsregistreringar
							</p>
							<p className='text-sm text-muted-foreground mt-4'>
								Klicka på "Beräkna om" för att beräkna löneunderlag från befintlig data, eller kontrollera att det finns närvaroregistreringar eller godkända tidsregistreringar för denna period.
							</p>
							<Button
								variant='outline'
								size='sm'
								onClick={async () => {
									try {
										const response = await fetch(`/api/payroll/basis/debug?start=${periodStart}&end=${periodEnd}`);
										const data = await response.json();
										console.log('Debug data:', data);
										alert(
											`Debug Info:\n\n` +
											`Närvaroregistreringar: ${data.attendance_sessions?.total || 0} (${data.attendance_sessions?.completed || 0} kompletta)\n` +
											`Tidsregistreringar: ${data.time_entries?.total || 0} (${data.time_entries?.approved_completed || 0} godkända och kompletta)\n\n` +
											`Rekommendation: ${data.recommendations?.message || 'Okänt'}`
										);
									} catch (err) {
										console.error('Debug error:', err);
									}
								}}
								className='mt-4'
							>
								Debug: Visa vad som finns i databasen
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className='space-y-4'>
						{payrollBasis.map((entry) => (
							<Card key={entry.id} className={entry.locked ? 'border-green-500' : ''}>
								<CardHeader>
									<div className='flex items-center justify-between'>
										<div>
											<CardTitle className='text-xl'>
												{entry.person.full_name}
											</CardTitle>
											<p className='text-sm text-muted-foreground mt-1'>
												{entry.person.email}
											</p>
										</div>
										<div className='flex items-center gap-2'>
											{entry.locked ? (
												<>
													<div className='flex items-center gap-2 text-green-600'>
														<Lock className='w-5 h-5' />
														<span className='text-sm font-medium'>Låst</span>
													</div>
													<Button
														size='sm'
														variant='outline'
														onClick={() => handleLock(entry.id, false)}
														disabled={lockingEntryIds.has(entry.id)}
														className='flex items-center gap-1.5'
													>
														{lockingEntryIds.has(entry.id) ? (
															<Loader2 className='w-3.5 h-3.5 animate-spin' />
														) : (
															<LockOpen className='w-3.5 h-3.5' />
														)}
														Upplås
													</Button>
												</>
											) : (
												<Button
													size='sm'
													variant='outline'
													onClick={() => handleLock(entry.id, true)}
													disabled={lockingEntryIds.has(entry.id)}
													className='flex items-center gap-1.5'
												>
													{lockingEntryIds.has(entry.id) ? (
														<Loader2 className='w-3.5 h-3.5 animate-spin' />
													) : (
														<Lock className='w-3.5 h-3.5' />
													)}
													Lås
												</Button>
											)}
										</div>
									</div>
									<p className='text-sm text-muted-foreground mt-2'>
										{new Date(entry.period_start).toLocaleDateString('sv-SE')} -{' '}
										{new Date(entry.period_end).toLocaleDateString('sv-SE')}
									</p>
								</CardHeader>
								<CardContent>
									<div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
										<div>
											<p className='text-sm text-muted-foreground'>Normaltid</p>
											<p className='text-lg font-semibold'>
												{formatHours(Number(entry.hours_norm))}
											</p>
										</div>
										<div>
											<p className='text-sm text-muted-foreground'>Övertid</p>
											<p className='text-lg font-semibold'>
												{formatHours(Number(entry.hours_overtime))}
											</p>
										</div>
										<div>
											<p className='text-sm text-muted-foreground'>OB-timmar</p>
											<p className='text-lg font-semibold'>
												{formatHours(Number(entry.ob_hours))}
											</p>
										</div>
										<div>
											<p className='text-sm text-muted-foreground'>Rast</p>
											<p className='text-lg font-semibold'>
												{formatHours(Number(entry.break_hours))}
											</p>
										</div>
										<div>
											<p className='text-sm text-muted-foreground'>Totalt</p>
											<p className='text-lg font-semibold text-orange-600'>
												{formatHours(Number(entry.total_hours))}
											</p>
										</div>
										<div>
											<p className='text-sm text-muted-foreground'>Bruttolön</p>
											<p className='text-lg font-semibold text-green-600'>
												{entry.gross_salary_sek !== null && entry.gross_salary_sek !== undefined && Number(entry.gross_salary_sek) > 0
													? `${Number(entry.gross_salary_sek).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
													: 'Ej angiven'}
											</p>
										</div>
									</div>
									{entry.locked && entry.locked_at && (
										<p className='text-xs text-muted-foreground mt-4'>
											Låst: {new Date(entry.locked_at).toLocaleString('sv-SE')}
										</p>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				)}
					</TabsContent>

					{/* Löneregler Tab */}
					<TabsContent value='rules' className='space-y-6'>
						<PayrollSalaryRates />
						<PayrollRulesForm />
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

