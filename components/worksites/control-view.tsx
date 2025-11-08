'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CorrectionDialog } from './correction-dialog';
import { cn } from '@/lib/utils';

interface Session {
	id: string;
	name: string;
	company?: string;
	check_in_ts: string;
	check_out_ts?: string;
	source_last: string;
  corrected?: boolean;
}

interface ControlViewProps {
	projectId: string;
	initialData?: {
		active: boolean;
		project?: {
			name: string;
			worksite_code?: string;
		};
	};
}

export function ControlView({ projectId, initialData }: ControlViewProps) {
	const [activeTab, setActiveTab] = useState<'now' | 'today' | 'period'>('now');
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [periodFrom, setPeriodFrom] = useState('');
	const [periodTo, setPeriodTo] = useState('');
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

	useEffect(() => {
		fetchSessions();
	}, [activeTab, projectId]);

	const fetchSessions = async () => {
		setLoading(true);
		try {
			const now = new Date();
			const today = format(now, 'yyyy-MM-dd');
			let url = `/api/worksites/${projectId}/sessions`;
			
			if (activeTab === 'now') {
				// Last 24 hours
				const yesterday = new Date(now);
				yesterday.setDate(yesterday.getDate() - 1);
				url += `?from=${format(yesterday, 'yyyy-MM-dd')}&to=${today}`;
			} else if (activeTab === 'today') {
				url += `?from=${today}&to=${today}`;
			} else if (activeTab === 'period' && periodFrom && periodTo) {
				url += `?from=${periodFrom}&to=${periodTo}`;
			}
			
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				setSessions(data.sessions || []);
			}
		} catch (error) {
			console.error('Error fetching sessions:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleExportPDF = async () => {
		try {
			const now = new Date();
			const today = format(now, 'yyyy-MM-dd');
			let from = '';
			let to = '';
			
			if (activeTab === 'now') {
				const yesterday = new Date(now);
				yesterday.setDate(yesterday.getDate() - 1);
				from = format(yesterday, 'yyyy-MM-dd');
				to = today;
			} else if (activeTab === 'today') {
				from = today;
				to = today;
			} else if (activeTab === 'period' && periodFrom && periodTo) {
				from = periodFrom;
				to = periodTo;
			} else {
				console.error('Please select a period before exporting');
				return;
			}
			
			const url = `/api/exports/worksite?projectId=${projectId}&from=${from}&to=${to}&format=pdf`;
			
			// Download file
			const response = await fetch(url);
			if (!response.ok) throw new Error('Export failed');
			
			const blob = await response.blob();
			const link = document.createElement('a');
			const downloadUrl = URL.createObjectURL(blob);
			link.setAttribute('href', downloadUrl);
			link.setAttribute('download', `kontroll-${projectId}-${Date.now()}.txt`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error('Error exporting PDF:', error);
		}
	};

	const handleExportCSV = async () => {
		try {
			// Create CSV header
			const headers = ['Namn', 'Företag', 'In', 'Ut', 'Källa'];
			const rows = filteredSessions.map(s => [
				s.name || '',
				s.company || '',
				format(new Date(s.check_in_ts), 'yyyy-MM-dd HH:mm:ss', { locale: sv }),
				s.check_out_ts ? format(new Date(s.check_out_ts), 'yyyy-MM-dd HH:mm:ss', { locale: sv }) : '',
				s.source_last || ''
			]);
			
			// Create CSV content
			const csvContent = [
				headers.join(','),
				...rows.map(row => row.map(cell => `"${cell}"`).join(','))
			].join('\n');
			
			// Generate hash (simple implementation, should use proper crypto in production)
			const encoder = new TextEncoder();
			const data = encoder.encode(csvContent);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
			
			// Add metadata
			const metadata = [
				'# Kontrollperiod',
				`# Projekt: ${initialData?.project?.name}`,
				`# Plats-ID: ${initialData?.project?.worksite_code || '—'}`,
				`# Period: ${activeTab === 'now' ? 'Nu (senaste 24h)' : activeTab === 'today' ? 'Idag' : `${periodFrom} - ${periodTo}`}`,
				`# SHA256-hash: ${hashHex}`,
				'',
				csvContent
			].join('\n');
			
			// Download
			const blob = new Blob([metadata], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', `kontroll-${projectId}-${Date.now()}.csv`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Error exporting CSV:', error);
		}
	};

	const filteredSessions = sessions.filter(s => 
		s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		s.company?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className='space-y-6 p-6 text-[var(--color-gray-900)] dark:text-[#f5eee6]'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-semibold tracking-tight text-[var(--color-gray-900)] dark:text-[#f7e3c8]'>Kontrollvy</h1>
					<p className='text-[11px] uppercase tracking-[0.3em] text-[var(--color-gray-500)] dark:text-[#bcae9f]'>
						Projekt: {initialData?.project?.name} • {initialData?.project?.worksite_code || '—'}
					</p>
				</div>
				<Badge
					variant='outline'
					className={cn(
						'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]',
						initialData?.active
							? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-200'
							: 'border-[var(--color-gray-300)] bg-[var(--color-gray-100)] text-[var(--color-gray-600)] dark:border-[#4a3527] dark:bg-[#1c120c] dark:text-[#d3c6b8]'
					)}
				>
					{initialData?.active ? 'Aktiv' : 'Av'}
				</Badge>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
				<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
					<TabsList className='inline-flex w-full max-w-md items-center justify-between rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-100)] p-1 text-sm font-medium text-[var(--color-gray-600)] shadow-[0_18px_32px_-24px_rgba(0,0,0,0.1)] dark:border-[#5b4b3c] dark:bg-[#191713] dark:text-[#ccbca8] dark:shadow-[0_20px_38px_-26px_rgba(0,0,0,0.8)]'>
						<TabsTrigger value='now' className='rounded-full px-4 py-2 transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#2c1d14] dark:data-[state=active]:text-[#fbf3e8]'>
							Nu
						</TabsTrigger>
						<TabsTrigger value='today' className='rounded-full px-4 py-2 transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#2c1d14] dark:data-[state=active]:text-[#fbf3e8]'>
							Idag
						</TabsTrigger>
						<TabsTrigger value='period' className='rounded-full px-4 py-2 transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#2c1d14] dark:data-[state=active]:text-[#fbf3e8]'>
							Period
						</TabsTrigger>
					</TabsList>
					
					{/* Export buttons */}
					<div className='flex gap-2 md:justify-end'>
						<Button
							variant='outline'
							size='sm'
							onClick={handleExportPDF}
							className='rounded-full border border-[var(--color-gray-300)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gray-800)] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] dark:border-[#4a3527] dark:bg-[#21140f] dark:text-[#e8ded2] dark:hover:border-[#f3c089] dark:hover:bg-[#2c1d14]'
						>
							<Download className='w-4 h-4 mr-2' />
							PDF
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={handleExportCSV}
							className='rounded-full border border-[var(--color-gray-300)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gray-800)] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] dark:border-[#4a3527] dark:bg-[#21140f] dark:text-[#e8ded2] dark:hover:border-[#f3c089] dark:hover:bg-[#2c1d14]'
						>
							<Download className='w-4 h-4 mr-2' />
							CSV
						</Button>
					</div>
				</div>

				{/* Period date inputs */}
				{activeTab === 'period' && (
					<Card className='mb-4 rounded-3xl border border-[var(--color-gray-200)] bg-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.12)] dark:border-[#3b291d] dark:bg-[#201e1d] dark:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.75)]'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base font-semibold text-[var(--color-gray-900)] dark:text-[#f7e3c8]'>Välj period</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4 text-[var(--color-gray-700)] dark:text-[#e7ddd0]'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='mb-2 block text-sm font-medium text-[var(--color-gray-700)] dark:text-[#f1e2d4]'>Från</label>
									<Input
										type='date'
										value={periodFrom}
										onChange={(e) => setPeriodFrom(e.target.value)}
										className='border-[var(--color-gray-300)] dark:border-[#4a3527] dark:bg-[#21140f] dark:text-[#f1e2d4]'
									/>
								</div>
								<div>
									<label className='mb-2 block text-sm font-medium text-[var(--color-gray-700)] dark:text-[#f1e2d4]'>Till</label>
									<Input
										type='date'
										value={periodTo}
										onChange={(e) => setPeriodTo(e.target.value)}
										className='border-[var(--color-gray-300)] dark:border-[#4a3527] dark:bg-[#21140f] dark:text-[#f1e2d4]'
									/>
								</div>
							</div>
							<Button
								className='mt-2 rounded-full bg-[var(--color-orange-500)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-orange-600)] dark:bg-[#f3c089] dark:text-[#2f1b0f] dark:hover:bg-[#f5c99a]'
								onClick={fetchSessions}
								disabled={!periodFrom || !periodTo}
							>
								Visa period
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Search */}
				<div className='mb-4'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-gray-500)] dark:text-[#bcae9f]' />
						<Input
							placeholder='Sök på namn eller företag...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-10 border-[var(--color-gray-300)] dark:border-[#4a3527] dark:bg-[#21140f] dark:text-[#f1e2d4]'
						/>
					</div>
				</div>

				{/* Sessions table */}
				<TabsContent value={activeTab} className='space-y-4'>
					<Card className='rounded-3xl border border-[var(--color-gray-200)] bg-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.12)] dark:border-[#3b291d] dark:bg-[#201e1d] dark:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.75)]'>
						<CardContent className='p-0'>
							{loading ? (
								<div className='flex items-center justify-center py-12'>
									<Loader2 className='w-8 h-8 animate-spin text-[var(--color-gray-500)] dark:text-[#d3c6b8]' />
								</div>
							) : filteredSessions.length > 0 ? (
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead className='border-b border-[var(--color-gray-200)] bg-[var(--color-gray-100)] text-[var(--color-gray-600)] dark:border-[#3b291d] dark:bg-[#191713] dark:text-[#ccbca8]'>
											<tr>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>Namn</th>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>Företag</th>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>In</th>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>Ut</th>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>Källa</th>
												<th className='p-3 text-left text-xs font-semibold uppercase tracking-[0.24em]'>Korrigerad</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-[var(--color-gray-200)] text-[var(--color-gray-700)] dark:divide-[#3b291d] dark:text-[#e7ddd0]'>
											{filteredSessions.map((s) => (
												<tr
													key={s.id}
													className='cursor-pointer transition-colors hover:bg-[var(--color-gray-50)] dark:hover:bg-[#2c1d14]'
													onClick={() => setSelectedSessionId(s.id)}
												>
													<td className='p-3 text-[var(--color-gray-900)] dark:text-[#f4e3cf]'>{s.name || s.id}</td>
													<td className='p-3 text-[var(--color-gray-600)] dark:text-[#d7c9bc]'>{s.company || '—'}</td>
													<td className='p-3 text-[var(--color-gray-600)] dark:text-[#d7c9bc]'>
														{format(new Date(s.check_in_ts), 'PPpp', { locale: sv })}
													</td>
													<td className='p-3 text-[var(--color-gray-600)] dark:text-[#d7c9bc]'>
														{s.check_out_ts 
															? format(new Date(s.check_out_ts), 'PPpp', { locale: sv })
															: '—'
														}
													</td>
													<td className='p-3 text-[var(--color-gray-600)] dark:text-[#d7c9bc]'>{s.source_last || '—'}</td>
													<td className='p-3 text-[var(--color-gray-600)] dark:text-[#d7c9bc]'>
														{s.corrected ? (
															<Badge variant='outline' className='rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/18 dark:text-emerald-200'>
																Ja
															</Badge>
														) : (
															'Nej'
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className='py-12 text-center text-[var(--color-gray-500)] dark:text-[#bcae9f]'>
									<p>Inga sessioner hittades</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
			{selectedSessionId && (
				<CorrectionDialog
					projectId={projectId}
					sessionId={selectedSessionId}
					open={true}
					onOpenChange={(v) => !v && setSelectedSessionId(null)}
					onUpdated={() => {
						setSelectedSessionId(null);
						fetchSessions();
					}}
				/>
			)}
		</div>
	);
}

