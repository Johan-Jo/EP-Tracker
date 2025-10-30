'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileText, Clock, CheckCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface AtaPageNewProps {
	orgId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
	projectId?: string;
}

export function AtaPageNew({ orgId, userRole, projectId }: AtaPageNewProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedProject, setSelectedProject] = useState<string>(projectId || 'all');
	const supabase = createClient();
	
	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setSelectedProject(projectId);
		}
	}, [projectId]);

	const canApprove = userRole === 'admin' || userRole === 'foreman';

	// Fetch projects for filter
	const { data: projects = [] } = useQuery({
		queryKey: ['projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
		staleTime: 5 * 60 * 1000,  // 5 minutes (projects rarely change)
		gcTime: 10 * 60 * 1000,     // 10 minutes
	});

	// Fetch ATA records
	const { data: ataRecords = [], isLoading } = useQuery({
		queryKey: ['ata', orgId, selectedProject],
		queryFn: async () => {
			let query = supabase
				.from('ata')
				.select(`
					*,
					project:projects(id, name, project_number)
				`)
				.eq('org_id', orgId);

			if (selectedProject !== 'all') {
				query = query.eq('project_id', selectedProject);
			}

			const { data, error } = await query.order('created_at', { ascending: false });

			if (error) throw error;
			return data || [];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes (ÄTA don't change often)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'draft':
				return 'bg-gray-100 text-gray-700 border-gray-200';
			case 'pending_approval':
				return 'bg-yellow-100 text-yellow-700 border-yellow-200';
			case 'approved':
				return 'bg-green-100 text-green-700 border-green-200';
			case 'rejected':
				return 'bg-red-100 text-red-700 border-red-200';
			case 'invoiced':
				return 'bg-blue-100 text-blue-700 border-blue-200';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'draft':
				return 'Utkast';
			case 'pending_approval':
				return 'Väntar godkännande';
			case 'approved':
				return 'Godkänd';
			case 'rejected':
				return 'Avvisad';
			case 'invoiced':
				return 'Fakturerad';
			default:
				return status;
		}
	};

	// Calculate stats
	const totalAmount = ataRecords.reduce((sum: number, ata: any) => sum + (ata.total_sek || 0), 0);
	const pendingCount = ataRecords.filter((ata: any) => ata.status === 'pending_approval').length;
	const approvedAmount = ataRecords
		.filter((ata: any) => ata.status === 'approved' || ata.status === 'invoiced')
		.reduce((sum: number, ata: any) => sum + (ata.total_sek || 0), 0);
	const invoicedAmount = ataRecords
		.filter((ata: any) => ata.status === 'invoiced')
		.reduce((sum: number, ata: any) => sum + (ata.total_sek || 0), 0);

	// Filter ATA records based on search
	const filteredRecords = ataRecords.filter((ata: any) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			ata.title?.toLowerCase().includes(query) ||
			ata.description?.toLowerCase().includes(query) ||
			ata.ata_number?.toLowerCase().includes(query) ||
			ata.project?.name?.toLowerCase().includes(query)
		);
	});

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight mb-1'>ÄTA</h1>
							<p className='text-sm text-muted-foreground'>
								Hantera ändrings- och tilläggsarbeten
							</p>
						</div>
					<Button
						asChild
						className='bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-200'
					>
						<Link href={projectId ? `/dashboard/ata/new?project_id=${projectId}` : '/dashboard/ata/new'}>
							<Plus className='w-4 h-4 mr-2' />
							<span className='hidden md:inline'>Ny ÄTA</span>
							<span className='md:hidden'>Ny</span>
						</Link>
					</Button>
					</div>

				{/* Search and Project Filter */}
				<div className='flex flex-col sm:flex-row gap-3'>
					<div className='relative flex-1'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<Input
							placeholder='Sök ÄTA...'
							className='pl-9'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					{!projectId && (
						<Select value={selectedProject} onValueChange={setSelectedProject}>
							<SelectTrigger className='w-full sm:w-64'>
								<SelectValue placeholder='Alla projekt' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>Alla projekt</SelectItem>
								{projects.map((project: any) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				{/* Stats */}
				<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-orange-50'>
								<FileText className='w-5 h-5 text-orange-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Totalt värde</p>
								<p className='text-xl'>{totalAmount.toLocaleString('sv-SE')} kr</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-yellow-100'>
								<Clock className='w-5 h-5 text-yellow-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Väntande</p>
								<p className='text-xl'>{pendingCount} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-green-100'>
								<CheckCircle className='w-5 h-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Godkänt</p>
								<p className='text-xl'>{approvedAmount.toLocaleString('sv-SE')} kr</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-blue-100'>
								<Receipt className='w-5 h-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Fakturerat</p>
								<p className='text-xl'>{invoicedAmount.toLocaleString('sv-SE')} kr</p>
							</div>
						</div>
					</div>
				</div>

				{/* ÄTA List */}
				<div>
					<h3 className='text-xl font-semibold mb-4'>ÄTA-register</h3>
					{isLoading ? (
						<div className='text-center py-12'>
							<p className='text-muted-foreground'>Laddar...</p>
						</div>
					) : filteredRecords.length === 0 ? (
						<div className='bg-card border-2 border-border rounded-xl p-12 text-center'>
							<FileText className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
							<h3 className='text-lg font-semibold mb-2'>Inga ÄTA-poster hittades</h3>
							<p className='text-muted-foreground mb-4'>
								{searchQuery
									? 'Prova att söka på något annat'
									: 'Börja genom att skapa en ny ÄTA'}
							</p>
							{!searchQuery && (
								<Button asChild>
									<Link href='/dashboard/ata/new'>
										<Plus className='w-4 h-4 mr-2' />
										Ny ÄTA
									</Link>
								</Button>
							)}
						</div>
					) : (
						<div className='space-y-3'>
							{filteredRecords.map((ata: any) => (
								<div
									key={ata.id}
									className='bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-orange-300 hover:shadow-lg hover:scale-[1.01] transition-all duration-200'
								>
									<div className='flex flex-col md:flex-row gap-4'>
										{/* Icon & Info */}
										<div className='flex-1 min-w-0'>
											<div className='flex items-start gap-3 mb-3'>
												<div className='p-2 rounded-lg shrink-0 bg-orange-50'>
													<FileText className='w-5 h-5 text-orange-600' />
												</div>
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2 mb-1'>
														{ata.ata_number && (
															<Badge variant='outline' className='text-xs'>
																{ata.ata_number}
															</Badge>
														)}
														<Badge
															className={`text-xs font-medium border-2 ${getStatusColor(
																ata.status
															)}`}
														>
															{getStatusText(ata.status)}
														</Badge>
													</div>
													<h4 className='font-semibold mb-1 truncate'>{ata.title}</h4>
													{ata.description && (
														<p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
															{ata.description}
														</p>
													)}
													<div className='flex flex-wrap gap-x-4 gap-y-1 text-sm'>
														<span className='text-muted-foreground'>
															{ata.project?.name || 'Inget projekt'}
														</span>
														{ata.qty && ata.unit && ata.unit_price_sek && (
															<span className='text-muted-foreground'>
																{ata.qty} {ata.unit} × {ata.unit_price_sek.toLocaleString('sv-SE')}{' '}
																kr
															</span>
														)}
														<span className='text-muted-foreground'>
															{new Date(ata.created_at).toLocaleDateString('sv-SE')}
														</span>
													</div>
												</div>
											</div>
										</div>

										{/* Price & Actions */}
										<div className='flex items-center justify-between md:flex-col md:items-end gap-3'>
											<div className='text-right'>
												<p className='text-sm text-muted-foreground'>Totalt</p>
												<p className='text-xl'>
													{(ata.total_sek || 0).toLocaleString('sv-SE')} kr
												</p>
											</div>
											<Button
												variant='outline'
												size='sm'
												asChild
												className='hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all duration-200'
											>
												<Link href={`/dashboard/ata/${ata.id}`}>Visa detaljer</Link>
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

