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

interface Session {
	id: string;
	name: string;
	company?: string;
	check_in_ts: string;
	check_out_ts?: string;
	source_last: string;
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
		// TODO: Implement PDF export with sha256 hash
		console.log('Export PDF - Not yet implemented');
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
		<div className='p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-2xl font-bold'>Kontrollvy</h1>
					<p className='text-sm text-muted-foreground'>
						Projekt: {initialData?.project?.name} • {initialData?.project?.worksite_code || '—'}
					</p>
				</div>
				<Badge variant={initialData?.active ? 'default' : 'secondary'}>
					{initialData?.active ? 'Aktiv' : 'Av'}
				</Badge>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
				<div className='flex items-center justify-between mb-4'>
					<TabsList>
						<TabsTrigger value='now'>Nu</TabsTrigger>
						<TabsTrigger value='today'>Idag</TabsTrigger>
						<TabsTrigger value='period'>Period</TabsTrigger>
					</TabsList>
					
					{/* Export buttons */}
					<div className='flex gap-2'>
						<Button variant='outline' size='sm' onClick={handleExportPDF}>
							<Download className='w-4 h-4 mr-2' />
							PDF
						</Button>
						<Button variant='outline' size='sm' onClick={handleExportCSV}>
							<Download className='w-4 h-4 mr-2' />
							CSV
						</Button>
					</div>
				</div>

				{/* Period date inputs */}
				{activeTab === 'period' && (
					<Card className='mb-4'>
						<CardHeader>
							<CardTitle className='text-base'>Välj period</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='text-sm font-medium mb-2 block'>Från</label>
									<Input
										type='date'
										value={periodFrom}
										onChange={(e) => setPeriodFrom(e.target.value)}
									/>
								</div>
								<div>
									<label className='text-sm font-medium mb-2 block'>Till</label>
									<Input
										type='date'
										value={periodTo}
										onChange={(e) => setPeriodTo(e.target.value)}
									/>
								</div>
							</div>
							<Button 
								className='mt-4' 
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
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
						<Input
							placeholder='Sök på namn eller företag...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-10'
						/>
					</div>
				</div>

				{/* Sessions table */}
				<TabsContent value={activeTab} className='space-y-4'>
					<Card>
						<CardContent className='p-0'>
							{loading ? (
								<div className='flex items-center justify-center py-12'>
									<Loader2 className='w-8 h-8 animate-spin text-muted-foreground' />
								</div>
							) : filteredSessions.length > 0 ? (
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead className='bg-muted/40 border-b'>
											<tr>
												<th className='text-left p-3 font-medium'>Namn</th>
												<th className='text-left p-3 font-medium'>Företag</th>
												<th className='text-left p-3 font-medium'>In</th>
												<th className='text-left p-3 font-medium'>Ut</th>
												<th className='text-left p-3 font-medium'>Källa</th>
											</tr>
										</thead>
										<tbody>
											{filteredSessions.map((s) => (
												<tr key={s.id} className='border-b hover:bg-muted/20'>
													<td className='p-3'>{s.name || s.id}</td>
													<td className='p-3'>{s.company || '—'}</td>
													<td className='p-3'>
														{format(new Date(s.check_in_ts), 'PPpp', { locale: sv })}
													</td>
													<td className='p-3'>
														{s.check_out_ts 
															? format(new Date(s.check_out_ts), 'PPpp', { locale: sv })
															: '—'
														}
													</td>
													<td className='p-3'>{s.source_last || '—'}</td>
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
		</div>
	);
}

