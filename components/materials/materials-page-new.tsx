'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Receipt, TrendingUp, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { AddMaterialDialog } from '@/components/materials/add-material-dialog';
import { MaterialDetailModal } from '@/components/materials/material-detail-modal';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface MaterialsPageNewProps {
	orgId: string;
	projectId?: string;
}

export function MaterialsPageNew({ orgId, projectId }: MaterialsPageNewProps) {
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<any>(null);
	const [viewingMaterial, setViewingMaterial] = useState<any>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedProject, setSelectedProject] = useState<string>(projectId || 'all');
	const supabase = createClient();
	const queryClient = useQueryClient();
	
	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setSelectedProject(projectId);
		}
	}, [projectId]);

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

	// Fetch materials and expenses
	const { data: materials = [], isLoading } = useQuery({
		queryKey: ['materials-expenses', orgId, selectedProject],
		queryFn: async () => {
			// Fetch materials
			let materialsQuery = supabase
				.from('materials')
				.select(`
					*,
					project:projects(id, name),
					phase:phases(id, name)
				`)
				.eq('org_id', orgId);

			if (selectedProject !== 'all') {
				materialsQuery = materialsQuery.eq('project_id', selectedProject);
			}

			const { data: materialsData, error: materialsError } = await materialsQuery.order('created_at', { ascending: false });

			if (materialsError) throw materialsError;

			// Fetch expenses
			let expensesQuery = supabase
				.from('expenses')
				.select(`
					*,
					project:projects(id, name)
				`)
				.eq('org_id', orgId);

			if (selectedProject !== 'all') {
				expensesQuery = expensesQuery.eq('project_id', selectedProject);
			}

			const { data: expensesData, error: expensesError } = await expensesQuery.order('created_at', { ascending: false });

			if (expensesError) throw expensesError;

			// Combine and normalize data
			const normalizedMaterials = (materialsData || []).map((m: any) => ({
				...m,
				category: 'material',
				name: m.description,
				quantity: m.qty,
				unit_price: m.unit_price_sek,
				total_price: m.total_sek,
				supplier: m.notes, // Using notes as supplier for now
				photo_urls: m.photo_urls || [],
			}));

			const normalizedExpenses = (expensesData || []).map((e: any) => ({
				...e,
				category: 'expense',
				name: e.description,
				quantity: 1,
				unit: 'st',
				unit_price: e.amount_sek,
				total_price: e.amount_sek,
				supplier: e.category,
				photo_urls: e.photo_urls || [],
			}));

			// Combine and sort by created_at
			return [...normalizedMaterials, ...normalizedExpenses].sort(
				(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		},
		staleTime: 1 * 60 * 1000,  // 1 minute (materials change more frequently)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'purchased':
				return 'bg-green-100 text-green-700 border-green-200';
			case 'ordered':
				return 'bg-blue-100 text-blue-700 border-blue-200';
			case 'approved':
				return 'bg-purple-100 text-purple-700 border-purple-200';
			case 'delivered':
				return 'bg-emerald-100 text-emerald-700 border-emerald-200';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'purchased':
				return 'Köpt';
			case 'ordered':
				return 'Beställd';
			case 'approved':
				return 'Godkänd';
			case 'delivered':
				return 'Levererad';
			default:
				return status;
		}
	};

	const getCategoryIcon = (category: string) => {
		return category === 'material' ? Package : Receipt;
	};

	// Calculate stats
	const totalMaterialCost = materials
		.filter((m: any) => m.category === 'material')
		.reduce((sum: number, m: any) => sum + (m.total_price || 0), 0);

	const totalExpenses = materials
		.filter((m: any) => m.category === 'expense')
		.reduce((sum: number, m: any) => sum + (m.total_price || 0), 0);

	// Filter materials based on search
	const filteredMaterials = materials.filter((material: any) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			material.name?.toLowerCase().includes(query) ||
			material.project?.name?.toLowerCase().includes(query) ||
			material.supplier?.toLowerCase().includes(query)
		);
	});

	return (
		<div className='flex-1 overflow-auto bg-gray-50 pb-20 transition-colors md:pb-0 dark:bg-[#0A0908]'>
			{/* Main Content */}
			<main className='mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8'>
				<section className='mb-6 space-y-4 text-[var(--color-gray-900)] dark:text-white'>
					<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Material & Utgifter</h1>
							<p className='text-sm text-muted-foreground dark:text-white/70'>
								Hantera material och projektutgifter
							</p>
						</div>
						<Button
							onClick={() => setShowAddDialog(true)}
							className='bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:scale-105 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/40'
							data-tour="add-material"
						>
							<Plus className='mr-2 h-4 w-4' />
							<span className='hidden md:inline'>Lägg till</span>
							<span className='md:hidden'>Nytt</span>
						</Button>
					</div>
					<div className='flex flex-col gap-3 md:flex-row'>
						<div className='relative flex-1'>
							<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								placeholder='Sök material eller utgift...'
								className='pl-9'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						{!projectId && (
							<Select value={selectedProject} onValueChange={setSelectedProject}>
								<SelectTrigger className='w-full md:w-64' data-tour="materials-tabs">
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
				</section>

				{/* Stats */}
				<div className='grid grid-cols-1 gap-4 md:grid-cols-4 mb-6'>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-orange-50'>
								<Package className='w-5 h-5 text-orange-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Material</p>
								<p className='text-xl'>{totalMaterialCost.toLocaleString('sv-SE')} kr</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-blue-100'>
								<Receipt className='w-5 h-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Utgifter</p>
								<p className='text-xl'>{totalExpenses.toLocaleString('sv-SE')} kr</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-green-100'>
								<TrendingUp className='w-5 h-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Totalt</p>
								<p className='text-xl'>
									{(totalMaterialCost + totalExpenses).toLocaleString('sv-SE')} kr
								</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-purple-100'>
								<Package className='w-5 h-5 text-purple-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Denna månad</p>
								<p className='text-xl'>
									{(totalMaterialCost + totalExpenses).toLocaleString('sv-SE')} kr
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Materials List */}
				<div>
					<h3 className='text-xl font-semibold mb-4'>Senaste material & utgifter</h3>
					{isLoading ? (
						<div className='text-center py-12'>
							<p className='text-muted-foreground'>Laddar...</p>
						</div>
					) : filteredMaterials.length === 0 ? (
						<div className='bg-card border-2 border-border rounded-xl p-12 text-center'>
							<Package className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
							<h3 className='text-lg font-semibold mb-2'>Inga material hittades</h3>
							<p className='text-muted-foreground mb-4'>
								{searchQuery
									? 'Prova att söka på något annat'
									: 'Börja genom att lägga till material eller utgifter'}
							</p>
							{!searchQuery && (
								<Button onClick={() => setShowAddDialog(true)}>
									<Plus className='w-4 h-4 mr-2' />
									Lägg till material
								</Button>
							)}
						</div>
					) : (
						<div className='space-y-3'>
							{filteredMaterials.map((material: any) => {
								const Icon = getCategoryIcon(material.category);

								return (
									<div
										key={material.id}
										className='bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-orange-300 hover:shadow-lg hover:scale-[1.01] transition-all duration-200'
									>
										<div className='flex flex-col md:flex-row gap-4'>
											{/* Icon & Info */}
											<div className='flex-1 min-w-0'>
												<div className='flex items-start gap-3 mb-3'>
													<div
														className={`p-2 rounded-lg shrink-0 ${
															material.category === 'material'
																? 'bg-orange-50'
																: 'bg-blue-100'
														}`}
													>
														<Icon
															className={`w-5 h-5 ${
																material.category === 'material'
																	? 'text-orange-600'
																	: 'text-blue-600'
															}`}
														/>
													</div>
													<div className='flex-1 min-w-0'>
														<h4 className='font-semibold mb-1 truncate'>
															{material.name}
														</h4>
														<p className='text-sm text-muted-foreground mb-2'>
															{material.project?.name || 'Inget projekt'}
														</p>
														<div className='flex flex-wrap gap-x-4 gap-y-1 text-sm'>
															<span className='text-muted-foreground'>
																{material.quantity} {material.unit}
															</span>
															<span className='text-muted-foreground'>
																{(material.unit_price || 0).toLocaleString('sv-SE')} kr/
																{material.unit}
															</span>
															{material.supplier && (
																<span className='text-muted-foreground'>
																	{material.supplier}
																</span>
															)}
															<span className='text-muted-foreground'>
																{new Date(material.created_at).toLocaleDateString('sv-SE')}
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
														{(material.total_price || 0).toLocaleString('sv-SE')} kr
													</p>
												</div>
												<div className='flex items-center gap-2'>
													{/* Receipt Icon */}
													{material.photo_urls && material.photo_urls.length > 0 && (
														<button
															onClick={() => setViewingMaterial(material)}
															className='relative p-2 bg-green-100 border-2 border-green-200 rounded-lg hover:bg-green-200 hover:border-green-300 transition-colors'
														>
															<FileImage className='w-5 h-5 text-green-700' />
															<Badge className='absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-green-600 text-white text-xs border-2 border-white'>
																{material.photo_urls.length}
															</Badge>
														</button>
													)}
													<Button
														variant='outline'
														size='sm'
														onClick={() => setViewingMaterial(material)}
														className='hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all duration-200'
													>
														Visa
													</Button>
													<Button
														variant='outline'
														size='sm'
														onClick={() => setEditingMaterial(material)}
														className='hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all duration-200'
													>
														Redigera
													</Button>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>

			{/* Add Material Dialog */}
		<AddMaterialDialog 
			open={showAddDialog} 
			onClose={() => setShowAddDialog(false)} 
			orgId={orgId}
			projectId={projectId}
		/>

			{/* Edit Material Dialog */}
			{editingMaterial && (
			<AddMaterialDialog 
				open={true} 
				onClose={() => setEditingMaterial(null)} 
				orgId={orgId}
				editingMaterial={editingMaterial}
				projectId={projectId}
			/>
			)}

			{/* View Material Detail Modal */}
			{viewingMaterial && (
				<MaterialDetailModal
					material={viewingMaterial}
					open={true}
					onClose={() => setViewingMaterial(null)}
					onEdit={() => {
						setEditingMaterial(viewingMaterial);
						setViewingMaterial(null);
					}}
				/>
			)}
			<PageTourTrigger tourId="materials" />
		</div>
	);
}

