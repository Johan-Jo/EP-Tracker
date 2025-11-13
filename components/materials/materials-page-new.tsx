'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Package, Receipt, TrendingUp, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { AddMaterialDialog } from '@/components/materials/add-material-dialog';
import { MaterialDetailModal } from '@/components/materials/material-detail-modal';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatUnitLabel } from '@/lib/utils/units';

const DRAFT_MATERIALS_STORAGE_PREFIX = 'ata-draft-materials:';
const DRAFT_EXPENSES_STORAGE_PREFIX = 'ata-draft-expenses:';

interface MaterialsPageNewProps {
	orgId: string;
	projectId?: string;
	ataDraftId?: string;
	ataTitle?: string | null;
	returnTo?: string | null;
}

type RawMaterialRow = {
	id: string;
	org_id: string;
	project_id: string | null;
	phase_id: string | null;
	description: string;
	qty: number;
	unit: string;
	unit_price_sek: number | null;
	total_sek: number | null;
	notes: string | null;
	created_at: string;
	photo_urls?: string[];
	project: { id: string; name: string } | null;
	phase: { id: string; name: string } | null;
	ata?: { id: string; title: string | null } | null;
};

type RawMaterialRowFromDb = Omit<RawMaterialRow, 'project' | 'phase'> & {
	project: { id: string; name: string } | { id: string; name: string }[] | null;
	phase: { id: string; name: string } | { id: string; name: string }[] | null;
	ata?: { id: string; title: string | null } | { id: string; title: string | null }[] | null;
};

type RawExpenseRow = {
	id: string;
	org_id: string;
	project_id: string | null;
	description: string;
	amount_sek: number | null;
	category: string | null;
	created_at: string;
	photo_urls?: string[];
	project: { id: string; name: string } | null;
	ata?: { id: string; title: string | null } | null;
};

type RawExpenseRowFromDb = Omit<RawExpenseRow, 'project'> & {
	project: { id: string; name: string } | { id: string; name: string }[] | null;
	ata?: { id: string; title: string | null } | { id: string; title: string | null }[] | null;
};

type UnifiedItem = {
	id: string;
	category: 'material' | 'expense';
	name: string;
	project: { id: string; name: string } | null;
	phase?: { id: string; name: string } | null;
	quantity: number;
	unit: string;
	unit_price: number | null;
	total_price: number | null;
	supplier: string | null;
	photo_urls: string[];
	created_at: string;
	raw: RawMaterialRow | RawExpenseRow;
};

export function MaterialsPageNew({ orgId, projectId, ataDraftId, ataTitle, returnTo }: MaterialsPageNewProps) {
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingMaterial, setEditingMaterial] = useState<UnifiedItem | null>(null);
	const [viewingMaterial, setViewingMaterial] = useState<UnifiedItem | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedProject, setSelectedProject] = useState<string>(projectId || 'all');
	const [entriesLimit, setEntriesLimit] = useState(200);
	const [ataDraftMaterialIds, setAtaDraftMaterialIds] = useState<string[]>([]);
	const [ataDraftExpenseIds, setAtaDraftExpenseIds] = useState<string[]>([]);
	const supabase = createClient();

	const registerMaterialForAta = useCallback(
		(materialId: string) => {
			if (!ataDraftId || typeof window === 'undefined') return;
			const key = `${DRAFT_MATERIALS_STORAGE_PREFIX}${ataDraftId}`;
			try {
				const stored = window.localStorage.getItem(key);
				const parsed = stored ? JSON.parse(stored) : [];
				const ids = Array.isArray(parsed)
					? parsed.filter((id: unknown): id is string => typeof id === 'string')
					: [];
				if (!ids.includes(materialId)) {
					const next = [...ids, materialId];
					window.localStorage.setItem(key, JSON.stringify(next));
					setAtaDraftMaterialIds(next);
					toast.success('Material kopplat till ÄTA-utkastet');
				}
			} catch (error) {
				console.error('Kunde inte uppdatera ATA-utkastets material-lista', error);
				const next = [materialId];
				window.localStorage.setItem(key, JSON.stringify(next));
				setAtaDraftMaterialIds(next);
				toast.success('Material kopplat till ÄTA-utkastet');
			}
		},
		[ataDraftId],
	);

	const registerExpenseForAta = useCallback(
		(expenseId: string) => {
			if (!ataDraftId || typeof window === 'undefined') return;
			const key = `${DRAFT_EXPENSES_STORAGE_PREFIX}${ataDraftId}`;
			try {
				const stored = window.localStorage.getItem(key);
				const parsed = stored ? JSON.parse(stored) : [];
				const ids = Array.isArray(parsed)
					? parsed.filter((id: unknown): id is string => typeof id === 'string')
					: [];
				if (!ids.includes(expenseId)) {
					const next = [...ids, expenseId];
					window.localStorage.setItem(key, JSON.stringify(next));
					setAtaDraftExpenseIds(next);
					toast.success('Utgift kopplad till ÄTA-utkastet');
				}
			} catch (error) {
				console.error('Kunde inte uppdatera ATA-utkastets utgiftslista', error);
				const next = [expenseId];
				window.localStorage.setItem(key, JSON.stringify(next));
				setAtaDraftExpenseIds(next);
				toast.success('Utgift kopplad till ÄTA-utkastet');
			}
		},
		[ataDraftId],
	);

	useEffect(() => {
		if (!ataDraftId || typeof window === 'undefined') {
			setAtaDraftMaterialIds([]);
			return;
		}

		const key = `${DRAFT_MATERIALS_STORAGE_PREFIX}${ataDraftId}`;

		const loadDraftMaterials = () => {
			try {
				const stored = window.localStorage.getItem(key);
				if (!stored) {
					setAtaDraftMaterialIds([]);
					return;
				}
				const parsed = JSON.parse(stored);
				if (!Array.isArray(parsed)) {
					setAtaDraftMaterialIds([]);
					return;
				}
				const unique = Array.from(
					new Set(parsed.filter((id: unknown): id is string => typeof id === 'string')),
				);
				setAtaDraftMaterialIds(unique);
			} catch {
				setAtaDraftMaterialIds([]);
			}
		};

		loadDraftMaterials();

		const handleStorage = (event: StorageEvent) => {
			if (event.key === key) {
				loadDraftMaterials();
			}
		};

		const handleVisibility = () => {
			if (!document.hidden) {
				loadDraftMaterials();
			}
		};

		window.addEventListener('storage', handleStorage);
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.removeEventListener('storage', handleStorage);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [ataDraftId]);

	useEffect(() => {
		if (!ataDraftId || typeof window === 'undefined') {
			setAtaDraftExpenseIds([]);
			return;
		}

		const key = `${DRAFT_EXPENSES_STORAGE_PREFIX}${ataDraftId}`;

		const loadDraftExpenses = () => {
			try {
				const stored = window.localStorage.getItem(key);
				if (!stored) {
					setAtaDraftExpenseIds([]);
					return;
				}
				const parsed = JSON.parse(stored);
				if (!Array.isArray(parsed)) {
					setAtaDraftExpenseIds([]);
					return;
				}
				const unique = Array.from(
					new Set(parsed.filter((id: unknown): id is string => typeof id === 'string')),
				);
				setAtaDraftExpenseIds(unique);
			} catch {
				setAtaDraftExpenseIds([]);
			}
		};

		loadDraftExpenses();

		const handleStorage = (event: StorageEvent) => {
			if (event.key === key) {
				loadDraftExpenses();
			}
		};

		const handleVisibility = () => {
			if (!document.hidden) {
				loadDraftExpenses();
			}
		};

		window.addEventListener('storage', handleStorage);
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.removeEventListener('storage', handleStorage);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [ataDraftId]);
	
	const normalizeSingleRelation = <T,>(relation: T | T[] | null | undefined): T | null => {
		if (!relation) return null;
		return Array.isArray(relation) ? relation[0] ?? null : relation;
	};

	const normalizeMaterialRow = (row: RawMaterialRowFromDb): RawMaterialRow => {
		return {
			...row,
			project: normalizeSingleRelation(row.project),
			phase: normalizeSingleRelation(row.phase),
			ata: normalizeSingleRelation(row.ata),
		};
	};

	const normalizeExpenseRow = (row: RawExpenseRowFromDb): RawExpenseRow => {
		return {
			...row,
			project: normalizeSingleRelation(row.project),
			ata: normalizeSingleRelation(row.ata),
		};
	};

	// Set selected project when projectId prop changes
	useEffect(() => {
		if (projectId) {
			setSelectedProject(projectId);
		}
	}, [projectId]);

	useEffect(() => {
		setEntriesLimit(200);
	}, [selectedProject]);

	// Fetch projects for filter
	type ProjectOption = { id: string; name: string };
	const { data: projects = [] } = useQuery<ProjectOption[]>({
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
	const { data: materials = [], isLoading, isFetching } = useQuery<UnifiedItem[]>({
		queryKey: ['materials-expenses', orgId, selectedProject, entriesLimit],
		queryFn: async () => {
			// Fetch materials
			let materialsQuery = supabase
				.from('materials')
				.select(
					`
					id,
					org_id,
					project_id,
					phase_id,
					description,
					qty,
					unit,
					unit_price_sek,
					total_sek,
					notes,
					created_at,
					photo_urls,
					ata:ata(id, title),
					project:projects(id, name),
					phase:phases(id, name)
				`,
				)
				.eq('org_id', orgId);

			if (selectedProject !== 'all') {
				materialsQuery = materialsQuery.eq('project_id', selectedProject);
			}

			const { data: materialsData, error: materialsError } = await materialsQuery
				.order('created_at', { ascending: false })
				.limit(entriesLimit);

			if (materialsError) throw materialsError;

			// Fetch expenses
			let expensesQuery = supabase
				.from('expenses')
				.select(
					`
					id,
					org_id,
					project_id,
					description,
					amount_sek,
					category,
					created_at,
					photo_urls,
					ata:ata(id, title),
					project:projects(id, name)
				`,
				)
				.eq('org_id', orgId);

			if (selectedProject !== 'all') {
				expensesQuery = expensesQuery.eq('project_id', selectedProject);
			}

			const { data: expensesData, error: expensesError } = await expensesQuery
				.order('created_at', { ascending: false })
				.limit(entriesLimit);

			if (expensesError) throw expensesError;

			// Combine and normalize data
			const normalizedMaterials: UnifiedItem[] = (materialsData || []).map((row) => {
				const material = normalizeMaterialRow(row as RawMaterialRowFromDb);
				return {
					...material,
					category: 'material' as const,
					name: material.description,
					quantity: material.qty,
					unit_price: material.unit_price_sek,
					total_price: material.total_sek,
					supplier: material.notes, // Using notes as supplier for now
					photo_urls: material.photo_urls || [],
					unit: material.unit,
					raw: material,
				};
			});

			const normalizedExpenses: UnifiedItem[] = (expensesData || []).map((row) => {
				const expense = normalizeExpenseRow(row as RawExpenseRowFromDb);
				return {
					...expense,
					category: 'expense' as const,
					name: expense.description,
					quantity: 1,
					unit: 'st',
					unit_price: expense.amount_sek,
					total_price: expense.amount_sek,
					supplier: expense.category,
					photo_urls: expense.photo_urls || [],
					raw: expense,
				};
			});

			// Combine and sort by created_at
			return [...normalizedMaterials, ...normalizedExpenses]
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
				.slice(0, entriesLimit);
		},
		staleTime: 1 * 60 * 1000,  // 1 minute (materials change more frequently)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	const getCategoryIcon = (category: 'material' | 'expense') => {
		return category === 'material' ? Package : Receipt;
	};

	// Calculate stats
	const { totalMaterialCost, totalExpenses } = useMemo(() => {
		return materials.reduce(
			(acc: { totalMaterialCost: number; totalExpenses: number }, m: UnifiedItem) => {
				if (m.category === 'material') {
					acc.totalMaterialCost += m.total_price || 0;
				} else if (m.category === 'expense') {
					acc.totalExpenses += m.total_price || 0;
				}
				return acc;
			},
			{ totalMaterialCost: 0, totalExpenses: 0 },
		);
	}, [materials]);

	// Filter materials based on search
	const filteredMaterials = useMemo(() => {
		if (!searchQuery) return materials;
		const query = searchQuery.toLowerCase();
		return materials.filter((material: UnifiedItem) => {
			return (
				material.name?.toLowerCase().includes(query) ||
				material.project?.name?.toLowerCase().includes(query) ||
				material.supplier?.toLowerCase().includes(query)
			);
		});
	}, [materials, searchQuery]);

	const canLoadMore = materials.length >= entriesLimit;
	const normalizedAtaTitle = useMemo(() => {
		if (!ataTitle) return null;
		try {
			return decodeURIComponent(ataTitle);
		} catch {
			return ataTitle;
		}
	}, [ataTitle]);
	const normalizedReturnTo = useMemo(() => {
		if (!returnTo) return null;
		try {
			return decodeURIComponent(returnTo);
		} catch {
			return returnTo;
		}
	}, [returnTo]);
	const draftMaterialSet = useMemo(() => new Set(ataDraftMaterialIds), [ataDraftMaterialIds]);
	const draftExpenseSet = useMemo(() => new Set(ataDraftExpenseIds), [ataDraftExpenseIds]);

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
									{projects.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</section>

				{ataDraftId && normalizedReturnTo && (
					<div className='mb-6 flex flex-col gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/80 p-4 md:flex-row md:items-center md:justify-between'>
						<div className='space-y-1'>
							<p className='text-sm font-semibold text-orange-800'>Kopplad till pågående ÄTA-utkast</p>
							<p className='text-xs text-orange-700'>
								Material du sparar här kopplas automatiskt till ÄTA-utkastet
								{normalizedAtaTitle ? ` "${normalizedAtaTitle}"` : ''}.
							</p>
						</div>
						<Button
							asChild
							variant='outline'
							size='sm'
							className='border-orange-400 text-orange-700 hover:bg-orange-100'
						>
							<Link href={normalizedReturnTo}>Tillbaka till ÄTA</Link>
						</Button>
					</div>
				)}

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
							{filteredMaterials.map((material: UnifiedItem) => {
								const Icon = getCategoryIcon(material.category);
								const isDraftLinked =
									material.category === 'material'
										? draftMaterialSet.has(material.id)
										: draftExpenseSet.has(material.id);
								const isLinkedToCurrentAta = Boolean(ataDraftId && isDraftLinked);
								const linkedAtaTitle =
									material.category === 'material'
										? material.raw.ata?.title || (isLinkedToCurrentAta ? normalizedAtaTitle : null)
										: material.raw.ata?.title || (isLinkedToCurrentAta ? normalizedAtaTitle : null);
								const projectLabel =
									linkedAtaTitle
										? `${material.project?.name || 'Inget projekt'} – (${linkedAtaTitle})`
										: material.project?.name || 'Inget projekt';

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
														{linkedAtaTitle && (
															<Badge className='bg-orange-100 text-orange-700 border-orange-300'>
																ÄTA: {linkedAtaTitle}
															</Badge>
														)}
														<p className='text-sm text-muted-foreground mb-2'>
															{projectLabel}
														</p>
														<div className='flex flex-wrap gap-x-4 gap-y-1 text-sm'>
															<span className='text-muted-foreground'>
																{material.quantity} {formatUnitLabel(material.unit)}
															</span>
															<span className='text-muted-foreground'>
																{(material.unit_price || 0).toLocaleString('sv-SE')} kr/
																{formatUnitLabel(material.unit)}
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
							{canLoadMore && !searchQuery && (
								<div className='flex justify-center pt-2'>
									<Button
										variant='outline'
										onClick={() => setEntriesLimit((prev) => prev + 200)}
										disabled={isFetching}
										className='flex items-center gap-2'
									>
										{isFetching ? (
											<>
												<Loader2 className='h-4 w-4 animate-spin' />
												Laddar fler...
											</>
										) : (
											'Visa fler'
										)}
									</Button>
								</div>
							)}
						</div>
					)}
				</div>
			</main>

			{/* Add Material Dialog */}
			<AddMaterialDialog
				open={showAddDialog}
				onClose={() => setShowAddDialog(false)}
				orgId={orgId}
				projectId={projectId || (selectedProject !== 'all' ? selectedProject : undefined)}
				ataTitle={normalizedAtaTitle}
				projectLocked={Boolean(ataDraftId)}
				onMaterialCreated={ataDraftId ? registerMaterialForAta : undefined}
				onExpenseCreated={ataDraftId ? registerExpenseForAta : undefined}
			/>

			{/* Edit Material Dialog */}
			{editingMaterial && (
			<AddMaterialDialog 
				open={true} 
				onClose={() => setEditingMaterial(null)} 
				orgId={orgId}
				editingMaterial={editingMaterial}
				projectId={projectId}
				ataTitle={normalizedAtaTitle}
				projectLocked={Boolean(ataDraftId)}
				onMaterialCreated={ataDraftId ? registerMaterialForAta : undefined}
				onExpenseCreated={ataDraftId ? registerExpenseForAta : undefined}
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

