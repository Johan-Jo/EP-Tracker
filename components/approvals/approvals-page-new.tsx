'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	ChevronLeft,
	ChevronRight,
	History,
	FileText,
	Clock,
	Package,
	Users,
	Download,
	Lock,
	Calendar,
	CheckCircle2,
	XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface ApprovalsPageNewProps {
	orgId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
}

export default function ApprovalsPageNew({ orgId }: ApprovalsPageNewProps) {
	const [selectedWeek, setSelectedWeek] = useState(43);
	const [selectedYear] = useState(2025);
	const [userSearchQuery, setUserSearchQuery] = useState('');
	const [projectSearchQuery, setProjectSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [selectedTimeEntries, setSelectedTimeEntries] = useState<string[]>([]);
	const [selectedCostEntries, setSelectedCostEntries] = useState<string[]>([]);
	const [activeTab, setActiveTab] = useState('time');
	const [showRejectDialog, setShowRejectDialog] = useState(false);
	const [rejectReason, setRejectReason] = useState('');
	const [showLockDialog, setShowLockDialog] = useState(false);
	const [lockWeek, setLockWeek] = useState(selectedWeek);
	const [lockYear, setLockYear] = useState(selectedYear);
	const supabase = createClient();

	// Fetch time entries for approval
	const { data: timeEntries = [] } = useQuery({
		queryKey: ['time-approvals', orgId, selectedWeek, selectedYear, statusFilter],
		queryFn: async () => {
			// Calculate week start and end dates
			const getWeekDates = (week: number, year: number) => {
				const firstDayOfYear = new Date(year, 0, 1);
				const daysOffset = (week - 1) * 7;
				const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
				
				// Adjust to Monday (ISO week)
				const day = weekStart.getDay();
				const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
				const monday = new Date(weekStart.setDate(diff));
				
				const sunday = new Date(monday);
				sunday.setDate(monday.getDate() + 6);
				
				return {
					start: monday.toISOString().split('T')[0],
					end: sunday.toISOString().split('T')[0] + 'T23:59:59',
				};
			};

			const { start, end } = getWeekDates(selectedWeek, selectedYear);

			let query = supabase
				.from('time_entries')
				.select(
					`
					*,
					user:profiles!time_entries_user_id_fkey(full_name),
					project:projects(name),
					phase:phases(name)
				`
				)
				.eq('org_id', orgId)
				.gte('start_at', start)
				.lte('start_at', end);

			if (statusFilter !== 'all') {
				query = query.eq('status', statusFilter);
			}

			const { data, error } = await query;

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch materials, expenses, and ÄTA for approval
	const { data: costEntries = [] } = useQuery({
		queryKey: ['cost-approvals', orgId, selectedWeek, selectedYear, statusFilter],
		queryFn: async () => {
			// Calculate week start and end dates
			const getWeekDates = (week: number, year: number) => {
				const firstDayOfYear = new Date(year, 0, 1);
				const daysOffset = (week - 1) * 7;
				const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
				
				// Adjust to Monday (ISO week)
				const day = weekStart.getDay();
				const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
				const monday = new Date(weekStart.setDate(diff));
				
				const sunday = new Date(monday);
				sunday.setDate(monday.getDate() + 6);
				
				return {
					start: monday.toISOString().split('T')[0],
					end: sunday.toISOString().split('T')[0] + 'T23:59:59',
				};
			};

			const { start, end } = getWeekDates(selectedWeek, selectedYear);

			// Build queries based on filter
			let materialsQuery = supabase
				.from('materials')
				.select(
					`
					*,
					user:profiles!materials_user_id_fkey(full_name),
					project:projects(name)
				`
				)
				.eq('org_id', orgId)
				.gte('created_at', start)
				.lte('created_at', end);

			let expensesQuery = supabase
				.from('expenses')
				.select(
					`
					*,
					user:profiles!expenses_user_id_fkey(full_name),
					project:projects(name)
				`
				)
				.eq('org_id', orgId)
				.gte('created_at', start)
				.lte('created_at', end);

			let ataQuery = supabase
				.from('ata')
				.select(
					`
					*,
					user:profiles!ata_created_by_fkey(full_name),
					project:projects(name)
				`
				)
				.eq('org_id', orgId)
				.gte('created_at', start)
				.lte('created_at', end);

			// Apply status filter
			if (statusFilter !== 'all') {
				if (statusFilter === 'pending') {
					// For materials and expenses, pending is 'draft' or 'submitted'
					materialsQuery = materialsQuery.in('status', ['draft', 'submitted']);
					expensesQuery = expensesQuery.in('status', ['draft', 'submitted']);
					// For ÄTA, pending is 'pending_approval'
					ataQuery = ataQuery.eq('status', 'pending_approval');
				} else {
					materialsQuery = materialsQuery.eq('status', statusFilter);
					expensesQuery = expensesQuery.eq('status', statusFilter);
					ataQuery = ataQuery.eq('status', statusFilter);
				}
			}

			const [materialsRes, expensesRes, ataRes] = await Promise.all([
				materialsQuery,
				expensesQuery,
				ataQuery,
			]);

			const materials = (materialsRes.data || []).map((m: any) => ({
				...m,
				type: 'Material',
				description: m.description,
				amount: m.total_sek,
			}));

			const expenses = (expensesRes.data || []).map((e: any) => ({
				...e,
				type: e.category || 'Utgift',
				description: e.description,
				amount: e.amount_sek,
			}));

			const ata = (ataRes.data || []).map((a: any) => ({
				...a,
				type: 'ÄTA',
				description: a.title,
				amount: a.total_sek,
				user: a.user,
			}));

			return [...materials, ...expenses, ...ata];
		},
	});

	// Fetch locked periods
	const { data: lockedPeriods = [], refetch: refetchLockedPeriods } = useQuery({
		queryKey: ['locked-periods', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('period_locks')
				.select(`
					*,
					locked_by_profile:profiles!period_locks_locked_by_fkey(full_name)
				`)
				.eq('org_id', orgId)
				.order('period_start', { ascending: false });

			if (error) throw error;
			return data || [];
		},
	});

	const pendingTimeReports = timeEntries.filter((e: any) => e.status === 'draft').length;
	const pendingCosts = costEntries.filter((e: any) => e.status === 'draft').length;
	const uniqueUsers = new Set([
		...timeEntries.filter((e: any) => e.status === 'draft').map((e: any) => e.user?.full_name),
		...costEntries.filter((e: any) => e.status === 'draft').map((e: any) => e.user?.full_name),
	]).size;

	const getWeekDateRange = (week: number, year: number) => {
		const startDate = new Date(year, 0, 1 + (week - 1) * 7);
		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 6);

		const formatDate = (date: Date) => {
			return `${date.getDate()} ${date.toLocaleDateString('sv-SE', { month: 'short' })}`;
		};

		return `${formatDate(startDate)} - ${formatDate(endDate)}`.toUpperCase();
	};

	const handlePreviousWeek = () => {
		if (selectedWeek > 1) {
			setSelectedWeek(selectedWeek - 1);
		}
	};

	const handleNextWeek = () => {
		if (selectedWeek < 52) {
			setSelectedWeek(selectedWeek + 1);
		}
	};

	const handleToggleTimeEntry = (id: string) => {
		setSelectedTimeEntries((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const handleToggleCostEntry = (id: string) => {
		setSelectedCostEntries((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const handleSelectAllTime = () => {
		if (selectedTimeEntries.length === timeEntries.length) {
			setSelectedTimeEntries([]);
		} else {
			setSelectedTimeEntries(timeEntries.map((e: any) => e.id));
		}
	};

	const handleSelectAllCost = () => {
		if (selectedCostEntries.length === costEntries.length) {
			setSelectedCostEntries([]);
		} else {
			setSelectedCostEntries(costEntries.map((e: any) => e.id));
		}
	};

	const handleLockPeriodClick = () => {
		setLockWeek(selectedWeek);
		setLockYear(selectedYear);
		setShowLockDialog(true);
	};

	const handleLockPeriodConfirm = async () => {
		const getWeekDates = (week: number, year: number) => {
			const firstDayOfYear = new Date(year, 0, 1);
			const daysOffset = (week - 1) * 7;
			const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
			
			const day = weekStart.getDay();
			const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
			const monday = new Date(weekStart.setDate(diff));
			
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			
			return {
				start: monday.toISOString().split('T')[0],
				end: sunday.toISOString().split('T')[0],
			};
		};

		const { start, end } = getWeekDates(lockWeek, lockYear);
		const { data: session } = await supabase.auth.getUser();

		const { error } = await supabase.from('period_locks').insert({
			org_id: orgId,
			period_start: start,
			period_end: end,
			locked_by: session.user?.id,
			reason: `Vecka ${lockWeek}, ${lockYear}`,
		});

		if (!error) {
			toast.success(`Period låst: Vecka ${lockWeek}, ${lockYear}`);
			setShowLockDialog(false);
			refetchLockedPeriods();
		} else {
			if (error.code === '23505') {
				toast.error('Denna period är redan låst');
			} else {
				toast.error('Kunde inte låsa period');
			}
		}
	};

	const handleUnlockPeriod = async (periodId: string) => {
		const { error } = await supabase.from('period_locks').delete().eq('id', periodId);

		if (!error) {
			toast.success('Period upplåst');
			refetchLockedPeriods();
		} else {
			toast.error('Kunde inte låsa upp period');
		}
	};

	const handleExportSalary = async () => {
		// Export approved time entries to CSV
		const approved = timeEntries.filter((e: any) => e.status === 'approved');
		if (approved.length === 0) {
			toast.error('Inga godkända tidrapporter att exportera');
			return;
		}

		const csv = [
			['Användare', 'Projekt', 'Fas', 'Datum', 'Timmar'].join(';'),
			...approved.map((e: any) =>
				[
					e.user?.full_name || '',
					e.project?.name || '',
					e.phase?.name || '',
					new Date(e.start_at).toLocaleDateString('sv-SE'),
					e.duration_min ? (e.duration_min / 60).toFixed(2) : '0',
				].join(';')
			),
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `loner_vecka${selectedWeek}_${selectedYear}.csv`;
		link.click();
		toast.success('Löne-CSV exporterad');
	};

	const handleExportInvoice = async () => {
		// Export approved costs to CSV
		const approved = costEntries.filter((e: any) => e.status === 'approved');
		if (approved.length === 0) {
			toast.error('Inga godkända kostnader att exportera');
			return;
		}

		const csv = [
			['Användare', 'Projekt', 'Typ', 'Beskrivning', 'Belopp'].join(';'),
			...approved.map((e: any) =>
				[
					e.user?.full_name || '',
					e.project?.name || '',
					e.type || '',
					e.description || '',
					(e.amount || 0).toFixed(2),
				].join(';')
			),
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `faktura_vecka${selectedWeek}_${selectedYear}.csv`;
		link.click();
		toast.success('Faktura-CSV exporterad');
	};

	const handleApprove = async () => {
		if (activeTab === 'time') {
			// Approve time entries
			const { error } = await supabase
				.from('time_entries')
				.update({ status: 'approved', approved_at: new Date().toISOString() })
				.in('id', selectedTimeEntries);

			if (!error) {
				setSelectedTimeEntries([]);
				// Refresh data
				window.location.reload();
			}
		} else {
			// Approve cost entries (materials, expenses, ÄTA)
			await Promise.all(
				selectedCostEntries.map(async (id) => {
					const entry = costEntries.find((e: any) => e.id === id);
					if (!entry) return;

					const table = entry.type === 'ÄTA' ? 'ata' : entry.type === 'Material' ? 'materials' : 'expenses';
					
					return supabase
						.from(table)
						.update({ status: 'approved', approved_at: new Date().toISOString() })
						.eq('id', id);
				})
			);

			setSelectedCostEntries([]);
			window.location.reload();
		}
	};

	const handleRejectClick = () => {
		setShowRejectDialog(true);
	};

	const handleRejectConfirm = async () => {
		if (!rejectReason.trim()) {
			toast.error('Ange en anledning för avvisning');
			return;
		}

		if (activeTab === 'time') {
			// Reject time entries
			const { error } = await supabase
				.from('time_entries')
				.update({ status: 'rejected', comments: rejectReason })
				.in('id', selectedTimeEntries);

			if (!error) {
				setSelectedTimeEntries([]);
				setShowRejectDialog(false);
				setRejectReason('');
				toast.success('Tidrapporter avvisade');
				window.location.reload();
			} else {
				toast.error('Kunde inte avvisa tidrapporter');
			}
		} else {
			// Reject cost entries
			const results = await Promise.all(
				selectedCostEntries.map(async (id) => {
					const entry = costEntries.find((e: any) => e.id === id);
					if (!entry) return null;

					const table = entry.type === 'ÄTA' ? 'ata' : entry.type === 'Material' ? 'materials' : 'expenses';
					
					return supabase
						.from(table)
						.update({ status: 'rejected', comments: rejectReason })
						.eq('id', id);
				})
			);

			const hasError = results.some(r => r?.error);
			
			if (!hasError) {
				setSelectedCostEntries([]);
				setShowRejectDialog(false);
				setRejectReason('');
				toast.success('Kostnader avvisade');
				window.location.reload();
			} else {
				toast.error('Kunde inte avvisa alla kostnader');
			}
		}
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight mb-1'>Godkännanden</h1>
							<p className='text-sm text-muted-foreground'>
								Granska och godkänn tidrapporter och kostnader
							</p>
						</div>
						<div className='flex gap-2'>
							<Button variant='outline' className='gap-2' asChild>
								<Link href='/dashboard/approvals/history'>
									<History className='w-4 h-4' />
									<span className='hidden md:inline'>Historik</span>
								</Link>
							</Button>
							<Button variant='outline' className='gap-2' asChild>
								<Link href='/dashboard/approvals/audit-logs'>
									<FileText className='w-4 h-4' />
									<span className='hidden md:inline'>Granskningslogger</span>
								</Link>
							</Button>
						</div>
					</div>

					{/* Period Selector */}
					<div className='bg-orange-50 border-2 border-orange-200 rounded-xl p-3 md:p-4'>
						<div className='flex items-center gap-2 mb-3'>
							<Calendar className='w-4 h-4 text-orange-600' />
							<span className='text-sm font-semibold text-orange-900'>Välj period</span>
						</div>
						<p className='text-xs text-muted-foreground mb-4 hidden md:block'>
							Granska och godkänn tidrapporter och kostnader
						</p>

					{/* Desktop layout */}
					<div className='hidden md:flex items-center justify-between gap-4' data-tour="week-selector">
						<Button
							variant='outline'
							size='sm'
							onClick={handlePreviousWeek}
							disabled={selectedWeek <= 1}
						>
								<ChevronLeft className='w-4 h-4 mr-1' />
								Föregående vecka
							</Button>

							<div className='text-center'>
								<div className='text-sm font-medium'>
									Vecka {selectedWeek}, {selectedYear}
								</div>
								<div className='text-xs text-muted-foreground'>{getWeekDateRange(selectedWeek, selectedYear)}</div>
								<div className='text-xs text-orange-600 font-medium mt-1'>Denna vecka</div>
							</div>

							<Button
								variant='outline'
								size='sm'
								onClick={handleNextWeek}
								disabled={selectedWeek >= 52}
							>
								Nästa vecka
								<ChevronRight className='w-4 h-4 ml-1' />
							</Button>
						</div>

						{/* Mobile layout */}
						<div className='md:hidden space-y-3'>
							<div className='text-center'>
								<div className='text-base font-semibold'>
									Vecka {selectedWeek}, {selectedYear}
								</div>
								<div className='text-xs text-muted-foreground'>{getWeekDateRange(selectedWeek, selectedYear)}</div>
								<div className='text-xs text-orange-600 font-medium mt-1'>Denna vecka</div>
							</div>
							
							<div className='flex items-center gap-2'>
								<Button
									variant='outline'
									size='sm'
									onClick={handlePreviousWeek}
									disabled={selectedWeek <= 1}
									className='flex-1'
								>
									<ChevronLeft className='w-4 h-4' />
									<span className='ml-1'>Föreg.</span>
								</Button>

								<Button
									variant='outline'
									size='sm'
									onClick={handleNextWeek}
									disabled={selectedWeek >= 52}
									className='flex-1'
								>
									<span className='mr-1'>Nästa</span>
									<ChevronRight className='w-4 h-4' />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				{/* Stats */}
				<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
					<button
						onClick={() => setActiveTab('time')}
						className={`bg-card border-2 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200 text-left w-full cursor-pointer ${
							activeTab === 'time' ? 'border-orange-400 shadow-md' : 'border-border'
						}`}
					>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-blue-100'>
								<Clock className='w-5 h-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Väntande tidrapporter</p>
								<p className='text-xl'>{pendingTimeReports}</p>
								<p className='text-xs text-muted-foreground'>För vald period</p>
							</div>
						</div>
					</button>

					<button
						onClick={() => setActiveTab('costs')}
						className={`bg-card border-2 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200 text-left w-full cursor-pointer ${
							activeTab === 'costs' ? 'border-orange-400 shadow-md' : 'border-border'
						}`}
					>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-green-100'>
								<Package className='w-5 h-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Väntande kostnader</p>
								<p className='text-xl'>{pendingCosts}</p>
								<p className='text-xs text-muted-foreground'>Material, utlägg, ÄTA</p>
							</div>
						</div>
					</button>

					<button
						onClick={() => {
							setStatusFilter('draft');
							setActiveTab('time');
						}}
						className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200 text-left w-full cursor-pointer'
					>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-orange-50'>
								<Users className='w-5 h-5 text-orange-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Unika användare</p>
								<p className='text-xl'>{uniqueUsers}</p>
								<p className='text-xs text-muted-foreground'>Med pendande poster</p>
							</div>
						</div>
					</button>
				</div>

				{/* Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4' data-tour="approvals-tabs">

					{/* Time Reports Tab */}
					<TabsContent value='time' className='space-y-4'>
						<div>
							<h3 className='text-xl font-semibold mb-4'>Tidrapporter att granska</h3>
							<p className='text-sm text-muted-foreground mb-4'>
								Granska och godkänn tidrapporter för perioden {getWeekDateRange(selectedWeek, selectedYear)}
							</p>

							{/* Search and Filters */}
							<div className='flex flex-col md:flex-row gap-2 mb-4'>
								<Input
									placeholder='Sök användare...'
									value={userSearchQuery}
									onChange={(e) => setUserSearchQuery(e.target.value)}
									className='flex-1'
								/>
								<Input
									placeholder='Sök projekt...'
									value={projectSearchQuery}
									onChange={(e) => setProjectSearchQuery(e.target.value)}
									className='flex-1'
								/>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className='w-full md:w-[180px]'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='draft'>Utkast</SelectItem>
										<SelectItem value='submitted'>Inskickat</SelectItem>
										<SelectItem value='approved'>Godkänt</SelectItem>
										<SelectItem value='rejected'>Avvisat</SelectItem>
										<SelectItem value='all'>Alla</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Action Buttons */}
							{selectedTimeEntries.length > 0 && (
								<div className='flex gap-2 mb-4'>
									<Button
										onClick={handleApprove}
										className='bg-green-600 hover:bg-green-700 text-white gap-2'
									>
										<CheckCircle2 className='w-4 h-4' />
										Godkänn ({selectedTimeEntries.length})
									</Button>
									<Button onClick={handleRejectClick} variant='outline' className='gap-2 text-red-600'>
										<XCircle className='w-4 h-4' />
										Avvisa ({selectedTimeEntries.length})
									</Button>
								</div>
							)}

							{/* Table */}
							<div className='bg-card border-2 border-border rounded-xl overflow-hidden'>
								<div className='overflow-x-auto'>
									<table className='w-full'>
										<thead className='bg-muted/50 border-b border-border'>
											<tr>
												<th className='text-left p-3 text-sm'>
													<Checkbox
														checked={
															selectedTimeEntries.length === timeEntries.length &&
															timeEntries.length > 0
														}
														onCheckedChange={handleSelectAllTime}
													/>
												</th>
												<th className='text-left p-3 text-sm'>Användare</th>
												<th className='text-left p-3 text-sm'>Projekt</th>
												<th className='text-left p-3 text-sm'>Fas</th>
												<th className='text-left p-3 text-sm'>Datum</th>
												<th className='text-left p-3 text-sm'>Tid</th>
												<th className='text-left p-3 text-sm'>Status</th>
											</tr>
										</thead>
										<tbody>
											{timeEntries.length === 0 && (
												<tr>
													<td colSpan={7} className='p-8 text-center'>
														<p className='text-muted-foreground'>
															Inga tidrapporter att visa för vald period
														</p>
													</td>
												</tr>
											)}
											{timeEntries.map((entry: any) => (
												<tr
													key={entry.id}
													className='border-b border-border hover:bg-orange-50/50 transition-colors'
												>
													<td className='p-3'>
														<Checkbox
															checked={selectedTimeEntries.includes(entry.id)}
															onCheckedChange={() => handleToggleTimeEntry(entry.id)}
														/>
													</td>
													<td className='p-3 text-sm'>{entry.user?.full_name || 'Okänd'}</td>
													<td className='p-3 text-sm'>{entry.project?.name || 'Inget projekt'}</td>
													<td className='p-3 text-sm'>{entry.phase?.name || '-'}</td>
													<td className='p-3 text-sm'>
														{new Date(entry.start_at).toLocaleDateString('sv-SE')}
													</td>
													<td className='p-3 text-sm'>
														{entry.duration_min ? `${Math.round(entry.duration_min / 60)}h` : '-'}
													</td>
													<td className='p-3'>
														<span className='inline-flex px-2 py-1 rounded-lg text-xs bg-yellow-100 text-yellow-700'>
															{entry.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</TabsContent>

					{/* Costs Tab */}
					<TabsContent value='costs' className='space-y-4'>
						<div>
							<h3 className='text-xl font-semibold mb-4'>Kostnader & ÄTA att granska</h3>
							<p className='text-sm text-muted-foreground mb-4'>
								Granska och godkänn material, utlägg och ÄTA för perioden {getWeekDateRange(selectedWeek, selectedYear)}
							</p>

							{/* Search and Filters */}
							<div className='flex flex-col md:flex-row gap-2 mb-4'>
								<Input
									placeholder='Sök användare...'
									value={userSearchQuery}
									onChange={(e) => setUserSearchQuery(e.target.value)}
									className='flex-1'
								/>
								<Input
									placeholder='Sök projekt...'
									value={projectSearchQuery}
									onChange={(e) => setProjectSearchQuery(e.target.value)}
									className='flex-1'
								/>
								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger className='w-full md:w-[180px]'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='draft'>Utkast</SelectItem>
										<SelectItem value='submitted'>Inskickat</SelectItem>
										<SelectItem value='approved'>Godkänt</SelectItem>
										<SelectItem value='rejected'>Avvisat</SelectItem>
										<SelectItem value='all'>Alla</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Action Buttons */}
							{selectedCostEntries.length > 0 && (
								<div className='flex gap-2 mb-4'>
									<Button
										onClick={handleApprove}
										className='bg-green-600 hover:bg-green-700 text-white gap-2'
									>
										<CheckCircle2 className='w-4 h-4' />
										Godkänn ({selectedCostEntries.length})
									</Button>
									<Button onClick={handleRejectClick} variant='outline' className='gap-2 text-red-600'>
										<XCircle className='w-4 h-4' />
										Avvisa ({selectedCostEntries.length})
									</Button>
								</div>
							)}

							{/* Table */}
							<div className='bg-card border-2 border-border rounded-xl overflow-hidden'>
								<div className='overflow-x-auto'>
									<table className='w-full'>
										<thead className='bg-muted/50 border-b border-border'>
											<tr>
												<th className='text-left p-3 text-sm'>
													<Checkbox
														checked={
															selectedCostEntries.length === costEntries.length && costEntries.length > 0
														}
														onCheckedChange={handleSelectAllCost}
													/>
												</th>
												<th className='text-left p-3 text-sm'>Användare</th>
												<th className='text-left p-3 text-sm'>Projekt</th>
												<th className='text-left p-3 text-sm'>Typ</th>
												<th className='text-left p-3 text-sm'>Beskrivning</th>
												<th className='text-left p-3 text-sm'>Datum</th>
												<th className='text-left p-3 text-sm'>Belopp</th>
												<th className='text-left p-3 text-sm'>Status</th>
											</tr>
										</thead>
										<tbody>
											{costEntries.length === 0 && (
												<tr>
													<td colSpan={8} className='p-8 text-center'>
														<p className='text-muted-foreground'>Inga kostnader att visa för vald period</p>
													</td>
												</tr>
											)}
											{costEntries.map((entry: any) => (
												<tr
													key={entry.id}
													className='border-b border-border hover:bg-orange-50/50 transition-colors'
												>
													<td className='p-3'>
														<Checkbox
															checked={selectedCostEntries.includes(entry.id)}
															onCheckedChange={() => handleToggleCostEntry(entry.id)}
														/>
													</td>
													<td className='p-3 text-sm'>{entry.user?.full_name || 'Okänd'}</td>
													<td className='p-3 text-sm'>{entry.project?.name || 'Inget projekt'}</td>
													<td className='p-3 text-sm'>{entry.type}</td>
													<td className='p-3 text-sm'>{entry.description}</td>
													<td className='p-3 text-sm'>
														{new Date(entry.created_at).toLocaleDateString('sv-SE')}
													</td>
													<td className='p-3 text-sm'>{(entry.amount || 0).toLocaleString('sv-SE')} kr</td>
													<td className='p-3'>
														<span className='inline-flex px-2 py-1 rounded-lg text-xs bg-yellow-100 text-yellow-700'>
															{entry.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>

			{/* Export Data */}
			<div className='mt-8 bg-card border-2 border-border rounded-xl p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200' data-tour="export-buttons">
				<h3 className='text-xl font-semibold mb-2'>Exportera data</h3>
				<p className='text-sm text-muted-foreground mb-4'>Generera CSV-filer för lön och fakturering</p>
				<div className='flex flex-wrap gap-2'>
						<Button variant='outline' className='gap-2' onClick={handleExportSalary}>
							<Download className='w-4 h-4' />
							Löner-CSV
						</Button>
						<Button variant='outline' className='gap-2' onClick={handleExportInvoice}>
							<Download className='w-4 h-4' />
							Faktura-CSV
						</Button>
						<Button variant='outline' className='gap-2' disabled>
							<Download className='w-4 h-4' />
							Bilagor (.zip)
						</Button>
					</div>
				</div>

				{/* Period Lock */}
				<div className='mt-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-6'>
					<div className='flex items-start gap-3'>
						<Lock className='w-5 h-5 text-orange-600 mt-0.5' />
						<div className='flex-1'>
							<div className='flex items-center justify-between mb-4'>
								<div>
									<h4 className='text-lg font-semibold text-orange-900'>Periodlås</h4>
									<p className='text-sm text-muted-foreground'>
										Lås veckor för att förhindra ändringar efter godkännande
									</p>
								</div>
								<Button onClick={handleLockPeriodClick} variant='outline'>
									<Lock className='w-4 h-4 mr-2' />
									Lås period
								</Button>
							</div>

							{lockedPeriods.length === 0 ? (
								<p className='text-sm text-muted-foreground italic'>
									Inga låsta perioder. Lås en period för att förhindra ändringar.
								</p>
							) : (
								<div className='space-y-2'>
									{lockedPeriods.map((period: any) => (
										<div
											key={period.id}
											className='flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200'
										>
											<div>
												<p className='text-sm font-medium'>
													{new Date(period.period_start).toLocaleDateString('sv-SE')} -{' '}
													{new Date(period.period_end).toLocaleDateString('sv-SE')}
												</p>
												<p className='text-xs text-muted-foreground'>
													Låst av {period.locked_by_profile?.full_name} • {new Date(period.locked_at).toLocaleDateString('sv-SE')}
												</p>
											</div>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => handleUnlockPeriod(period.id)}
												className='text-red-600 hover:text-red-700 hover:bg-red-50'
											>
												Lås upp
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Project Lock */}
				<div className='mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6'>
					<div className='flex items-start gap-3'>
						<Lock className='w-5 h-5 text-blue-600 mt-0.5' />
						<div className='flex-1'>
							<div className='flex items-center justify-between mb-4'>
								<div>
									<h4 className='text-lg font-semibold text-blue-900'>Projektlås</h4>
									<p className='text-sm text-muted-foreground'>
										Lås projekt för att förhindra ändringar efter fakturering
									</p>
								</div>
								<Link href='/dashboard/projects'>
									<Button variant='outline'>
										Hantera projekt
									</Button>
								</Link>
							</div>
							<p className='text-sm text-muted-foreground italic'>
								Gå till projektsidan för att låsa/låsa upp specifika projekt
							</p>
						</div>
					</div>
				</div>
			</main>

			{/* Reject Dialog */}
			<Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Avvisa {activeTab === 'time' ? 'tidrapporter' : 'kostnader'}</DialogTitle>
						<DialogDescription>
							Ange en anledning för avvisningen. Detta kommer att synas för användaren.
						</DialogDescription>
					</DialogHeader>
					<div className='py-4'>
						<Textarea
							placeholder='Anledning till avvisning...'
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							className='min-h-[100px]'
						/>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setShowRejectDialog(false);
								setRejectReason('');
							}}
						>
							Avbryt
						</Button>
						<Button
							variant='destructive'
							onClick={handleRejectConfirm}
							disabled={!rejectReason.trim()}
						>
							Avvisa
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Lock Period Dialog */}
			<Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Lås period</DialogTitle>
						<DialogDescription>
							Välj vilken vecka du vill låsa. När en period är låst kan inga ändringar göras.
						</DialogDescription>
					</DialogHeader>
					<div className='py-4 space-y-4'>
						<div>
							<label className='text-sm font-medium mb-2 block'>Vecka</label>
							<Select
								value={lockWeek.toString()}
								onValueChange={(value) => setLockWeek(parseInt(value))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
										<SelectItem key={week} value={week.toString()}>
											Vecka {week}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className='text-sm font-medium mb-2 block'>År</label>
							<Select
								value={lockYear.toString()}
								onValueChange={(value) => setLockYear(parseInt(value))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[2024, 2025, 2026].map((year) => (
										<SelectItem key={year} value={year.toString()}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setShowLockDialog(false);
							}}
						>
							Avbryt
						</Button>
						<Button
							onClick={handleLockPeriodConfirm}
							className='bg-orange-600 hover:bg-orange-700'
						>
							<Lock className='w-4 h-4 mr-2' />
							Lås period
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<PageTourTrigger tourId="approvals" />
		</div>
	);
}

