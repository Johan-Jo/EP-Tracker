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
		<div className='space-y-6 p-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='space-y-1'>
					<h1 className='text-2xl font-bold text-foreground dark:text-white'>Kontrollvy</h1>
					<p className='text-sm text-muted-foreground dark:text-white/70'>
						Projekt: {initialData?.project?.name} • {initialData?.project?.worksite_code || '—'}
					</p>
				</div>
				<Badge
					variant='outline'
					className={cn(
						'px-3 py-1 text-xs font-semibold',
						initialData?.active
							? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-200'
							: 'border-border/60 bg-muted/50 text-muted-foreground dark:border-[#3a251d] dark:bg-[#21140f] dark:text-white/70'
					)}
				>
					{initialData?.active ? 'Aktiv' : 'Av'}
				</Badge>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
				<div className='flex items-center justify-between mb-4'>
					<TabsList className='flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-[var(--color-card)]/80 p-1 text-muted-foreground shadow-sm dark:border-[#3a251d] dark:bg-[#21140f] dark:text-white/70'>
						<TabsTrigger value='now' className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'>
							Nu
						</TabsTrigger>
						<TabsTrigger value='today' className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'>
							Idag
						</TabsTrigger>
						<TabsTrigger value='period' className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'>
							Period
						</TabsTrigger>
					</TabsList>
					
					{/* Export buttons */}
					<div className='flex gap-2'>
						<Button variant='outline' size='sm' onClick={handleExportPDF} className='border-border/60 text-foreground hover:border-orange-500/40 hover:text-orange-500 dark:border-[#3a251d] dark:text-white dark:hover:border-orange-400 dark:hover:text-orange-200'>
							<Download className='w-4 h-4 mr-2' />
							PDF
						</Button>
						<Button variant='outline' size='sm' onClick={handleExportCSV} className='border-border/60 text-foreground hover:border-orange-500/40 hover:text-orange-500 dark:border-[#3a251d] dark:text-white dark:hover:border-orange-400 dark:hover:text-orange-200'>
							<Download className='w-4 h-4 mr-2' />
							CSV
						</Button>
					</div>
				</div>

				{/* Period date inputs */}
				{activeTab === 'period' && (
					<Card className='mb-4 rounded-2xl border border-border/60 bg-[var(--color-card)] shadow-sm dark:border-[#2d1b15] dark:bg-[#1b120d]'>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base text-foreground dark:text-white'>Välj period</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='mb-2 block text-sm font-medium text-foreground dark:text-white/90'>Från</label>
									<Input
										type='date'
										value={periodFrom}
										onChange={(e) => setPeriodFrom(e.target.value)}
										className='border-border/60 dark:border-[#3a251d] dark:bg-[#1f140f] dark:text-white'
									/>
								</div>
								<div>
									<label className='mb-2 block text-sm font-medium text-foreground dark:text-white/90'>Till</label>
									<Input
										type='date'
										value={periodTo}
										onChange={(e) => setPeriodTo(e.target.value)}
										className='border-border/60 dark:border-[#3a251d] dark:bg-[#1f140f] dark:text-white'
									/>
								</div>
							</div>
							<Button 
								className='mt-2'
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
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/60' />
						<Input
							placeholder='Sök på namn eller företag...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-10 border-border/60 dark:border-[#3a251d] dark:bg-[#1f140f] dark:text-white'
						/>
					</div>
				</div>

				{/* Sessions table */}
				<TabsContent value={activeTab} className='space-y-4'>
					<Card className='rounded-2xl border border-border/60 bg-[var(--color-card)] shadow-sm dark:border-[#2d1b15] dark:bg-[#1b120d]'>
						<CardContent className='p-0'>
							{loading ? (
								<div className='flex items-center justify-center py-12'>
									<Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
								</div>
							) : filteredSessions.length > 0 ? (
                <div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead className='border-b border-border/50 bg-muted/40 dark:border-[#2d1b15] dark:bg-[#21140f]'>
											<tr>
												<th className='p-3 text-left font-medium text-foreground dark:text-white'>Namn</th>
												<th className='p-3 text-left font-medium text-foreground dark:text-white'>Företag</th>
												<th className='p-3 text-left font-medium text-foreground dark:text-white'>In</th>
												<th className='p-3 text-left font-medium text-foreground dark:text-white'>Ut</th>
												<th className='p-3 text-left font-medium text-foreground dark:text-white'>Källa</th>
                        <th className='p-3 text-left font-medium text-foreground dark:text-white'>Korrigerad</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-border/40 dark:divide-[#2d1b15]'>
                      {filteredSessions.map((s) => (
                        <tr key={s.id} className='cursor-pointer transition-colors hover:bg-muted/15 dark:hover:bg-white/5' onClick={() => setSelectedSessionId(s.id)}>
													<td className='p-3 text-foreground dark:text-white'>{s.name || s.id}</td>
													<td className='p-3 text-muted-foreground dark:text-white/70'>{s.company || '—'}</td>
													<td className='p-3 text-muted-foreground dark:text-white/70'>
														{format(new Date(s.check_in_ts), 'PPpp', { locale: sv })}
													</td>
													<td className='p-3 text-muted-foreground dark:text-white/70'>
														{s.check_out_ts 
															? format(new Date(s.check_out_ts), 'PPpp', { locale: sv })
															: '—'
														}
													</td>
													<td className='p-3 text-muted-foreground dark:text-white/70'>{s.source_last || '—'}</td>
                          <td className='p-3 text-muted-foreground dark:text-white/70'>
                            {s.corrected ? <Badge variant='outline' className='border-emerald-500/40 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-200'>Ja</Badge> : 'Nej'}
                          </td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className='text-center py-12 text-muted-foreground'>
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

