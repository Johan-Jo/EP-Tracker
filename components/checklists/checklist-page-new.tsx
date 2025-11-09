'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, CheckSquare, Circle, CheckCircle2, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface ChecklistPageNewProps {
	orgId: string;
}

export function ChecklistPageNew({ orgId }: ChecklistPageNewProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');

	// Fetch checklists
	const { data: checklists = [] } = useQuery({
		queryKey: ['checklists', orgId],
		queryFn: async () => {
			const response = await fetch('/api/checklists');
			if (!response.ok) throw new Error('Failed to fetch checklists');
			const data = await response.json();
			return data.checklists || [];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes (checklists don't change often)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	const getStatusConfig = (checklist: any) => {
		const total = checklist.checklist_data?.items?.length || 0;
		const completed = checklist.checklist_data?.items?.filter((item: any) => item.checked).length || 0;

		if (checklist.completed_at) {
			return {
				label: 'Slutförd',
				color: 'bg-green-100 text-green-700 border-green-200',
				icon: CheckCircle2,
				status: 'completed'
			};
		} else if (completed > 0) {
			return {
				label: 'Pågående',
				color: 'bg-blue-100 text-blue-700 border-blue-200',
				icon: Circle,
				status: 'in-progress'
			};
		} else {
			return {
				label: 'Ej påbörjad',
				color: 'bg-gray-100 text-gray-700 border-gray-200',
				icon: Circle,
				status: 'not-started'
			};
		}
	};

	const filteredChecklists = checklists.filter((checklist: any) =>
		checklist.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		checklist.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const totalChecklists = checklists.length;
	const completedChecklists = checklists.filter((c: any) => c.completed_at).length;
	const inProgressChecklists = checklists.filter((c: any) => {
		const completed = c.checklist_data?.items?.filter((item: any) => item.checked).length || 0;
		return !c.completed_at && completed > 0;
	}).length;
	const notStartedChecklists = checklists.filter((c: any) => {
		const completed = c.checklist_data?.items?.filter((item: any) => item.checked).length || 0;
		return !c.completed_at && completed === 0;
	}).length;

	return (
		<div className='flex-1 overflow-auto bg-gray-50 pb-20 transition-colors md:pb-0 dark:bg-[#0A0908]'>
			{/* Main Content */}
			<main className='mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8'>
				<section className='mb-6 space-y-4 text-[var(--color-gray-900)] dark:text-white'>
					<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Checklistor</h1>
							<p className='text-sm text-muted-foreground dark:text-white/70'>
								Hantera checklistor för dina projekt
							</p>
						</div>
						<Button
							onClick={() => router.push('/dashboard/checklists/new')}
							className='bg-orange-500 text-white shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:bg-orange-600 hover:shadow-xl hover:shadow-primary/40'
						>
							<Plus className='mr-2 h-4 w-4' />
							Ny checklista
						</Button>
					</div>
					<div className='flex gap-2'>
						<div className='relative flex-1'>
							<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								placeholder='Sök checklistor...'
								className='pl-9'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<Button variant='outline' className='shrink-0'>
							Filter
						</Button>
					</div>
				</section>

				<section className='space-y-6'>
				{/* Stats */}
					<div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-accent'>
								<CheckSquare className='w-5 h-5 text-primary' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Totalt</p>
								<p className='text-xl font-semibold'>{totalChecklists} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-green-100'>
								<CheckCircle2 className='w-5 h-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Slutförda</p>
								<p className='text-xl font-semibold'>{completedChecklists} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-blue-100'>
								<Circle className='w-5 h-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Pågående</p>
								<p className='text-xl font-semibold'>{inProgressChecklists} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-gray-100'>
								<Circle className='w-5 h-5 text-gray-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Ej påbörjade</p>
								<p className='text-xl font-semibold'>{notStartedChecklists} st</p>
							</div>
						</div>
					</div>
				</div>

				{/* Checklist List */}
					<div>
						<h3 className='text-lg font-semibold mb-4'>Alla checklistor</h3>
						{filteredChecklists.length === 0 ? (
							<div className='bg-card rounded-xl border border-border p-6 md:p-8 text-center'>
								<div className='inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted mb-3 md:mb-4'>
									<CheckSquare className='w-6 h-6 md:w-8 md:h-8 text-muted-foreground' />
								</div>
								<p className='text-muted-foreground text-sm md:text-base'>
									{searchQuery ? 'Inga checklistor hittades' : 'Inga checklistor ännu'}
								</p>
								<p className='text-xs md:text-sm text-muted-foreground mt-2'>
									{searchQuery
										? 'Prova att söka efter något annat'
										: 'Skapa din första checklista för att komma igång'}
								</p>
							</div>
						) : (
							<div className='space-y-3'>
								{filteredChecklists.map((checklist: any) => {
									const statusConfig = getStatusConfig(checklist);
									const StatusIcon = statusConfig.icon;
									const totalItems = checklist.checklist_data?.items?.length || 0;
									const completedItems =
										checklist.checklist_data?.items?.filter((item: any) => item.checked).length || 0;
									const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

									return (
										<div
											key={checklist.id}
											className='bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-200'
										>
											<div className='flex flex-col md:flex-row gap-4'>
												{/* Main Content */}
												<div className='flex-1 min-w-0'>
													<div className='flex items-start gap-3 mb-3'>
														<div className='p-2 rounded-lg bg-accent shrink-0'>
															<CheckSquare className='w-5 h-5 text-primary' />
														</div>

														<div className='flex-1 min-w-0'>
															<h4 className='font-semibold mb-1'>{checklist.title}</h4>
															<p className='text-sm text-muted-foreground mb-3'>
																{checklist.project?.project_number
																	? `${checklist.project.project_number} - `
																	: ''}
																{checklist.project?.name}
															</p>

															{/* Progress Bar */}
															<div className='space-y-2'>
																<div className='flex items-center justify-between text-sm'>
																	<span className='text-muted-foreground'>
																		{completedItems} av {totalItems} punkter
																	</span>
																	<span className='text-primary font-medium'>{Math.round(progress)}%</span>
																</div>
																<div className='h-2 bg-muted rounded-full overflow-hidden'>
																	<div
																		className='h-full bg-primary transition-all duration-300 rounded-full'
																		style={{ width: `${progress}%` }}
																	/>
																</div>
															</div>
														</div>
													</div>

													{/* Details */}
													<div className='pl-0 md:pl-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
														<span className='flex items-center gap-1'>
															<Calendar className='w-3.5 h-3.5' />
															Skapad: {new Date(checklist.created_at).toLocaleDateString('sv-SE')}
														</span>
														<span>•</span>
														<span>
															Uppdaterad: {new Date(checklist.updated_at).toLocaleDateString('sv-SE')}
														</span>
													</div>
												</div>

												{/* Right Side - Status & Actions */}
												<div className='flex items-center justify-between md:flex-col md:items-end gap-3'>
													<div
														className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 ${statusConfig.color} flex items-center gap-1.5`}
													>
														<StatusIcon className='w-4 h-4' />
														<span>{statusConfig.label}</span>
													</div>

													<Button
														variant='outline'
														size='sm'
														asChild
														className='hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200'
													>
														<Link href={`/dashboard/checklists/${checklist.id}`}>
															<Eye className='w-4 h-4 mr-1' />
															Visa
														</Link>
													</Button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</section>
			</main>
		<PageTourTrigger tourId="checklists" />
	</div>
	);
}

