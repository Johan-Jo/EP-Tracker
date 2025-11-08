'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorksiteCard } from '@/components/worksites/worksite-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckInTab } from '@/components/worksites/check-in-tab';
import { ControlTab } from '@/components/worksites/control-tab';

interface WorksitesClientProps {
	worksites: Array<{
		id: string;
		name: string;
		project_number?: string | null;
		worksite_code?: string | null;
		address_line1?: string | null;
		address_line2?: string | null;
		city?: string | null;
		country?: string | null;
		status?: string;
	}>;
	canEdit: boolean;
	userId: string;
}

export function WorksitesClient({ worksites, canEdit, userId }: WorksitesClientProps) {
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		worksites && worksites.length > 0 ? worksites[0].id : null
	);
	const selectedProject = worksites.find(w => w.id === selectedProjectId);

	return (
		<div className='flex-1 overflow-auto bg-[var(--color-gray-50)] pb-20 transition-colors md:pb-0 dark:bg-black min-h-screen'>
			<div className='px-6 py-8 md:px-16 md:py-10'>
				<div className='max-w-5xl space-y-8 text-[var(--color-gray-900)] dark:text-white'>
					{/* Header */}
					<div>
						<h1 className='mb-1 text-3xl font-semibold tracking-tight text-[var(--color-gray-900)] dark:text-white'>
							Personalliggare
						</h1>
						<p className='text-sm text-[var(--color-gray-600)] dark:text-[#c6af96]'>
							Översikt över alla projekt med aktiv personalliggare
						</p>
					</div>

					{/* Main Content with Tabs */}
					<Tabs defaultValue='overview' className='w-full space-y-6'>
						<div className='flex justify-start'>
							<TabsList className='inline-flex items-center gap-1 rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-100)] px-1 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gray-600)] shadow-[0_18px_32px_-22px_rgba(0,0,0,0.12)] dark:border-[#5b4b3c] dark:bg-[#181715] dark:text-[#d0c2b3] dark:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)]'>
								<TabsTrigger
									value='overview'
									className='rounded-full px-7 py-2 text-xs transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#f5eee6] dark:data-[state=active]:text-[#211c18]'
								>
								Översikt
							</TabsTrigger>
								<TabsTrigger
									value='checkin'
									className='rounded-full px-7 py-2 text-xs transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#f5eee6] dark:data-[state=active]:text-[#211c18]'
								>
								Check-in
							</TabsTrigger>
								<TabsTrigger
									value='control'
									className='rounded-full px-7 py-2 text-xs transition-colors data-[state=active]:bg-white data-[state=active]:text-[var(--color-gray-900)] dark:data-[state=active]:bg-[#f5eee6] dark:data-[state=active]:text-[#211c18]'
								>
								Kontrollvy
							</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value='overview' className='mt-2 space-y-6'>
							{worksites && worksites.length > 0 ? (
								<>
									<div className='space-y-4'>
										{worksites.map((worksite) => (
											<WorksiteCard
												key={worksite.id}
												worksite={worksite}
												canEdit={canEdit}
												onSelect={() => setSelectedProjectId(worksite.id)}
												isSelected={selectedProjectId === worksite.id}
											/>
										))}
									</div>
								</>
							) : (
								<Card className='rounded-3xl border border-[var(--color-gray-300)] bg-white/90 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.25)] dark:border-[#3b2a1f] dark:bg-[#1f1a17] dark:text-[#f5eee6] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.75)]'>
									<CardContent className='py-12 text-center space-y-3'>
										<QrCode className='mx-auto h-12 w-12 text-[var(--color-gray-400)] dark:text-[#c6af96]' />
										<h3 className='text-lg font-semibold'>Inga aktiva personalliggare</h3>
										<p className='text-sm text-[var(--color-gray-600)] dark:text-[#c6af96]'>
											Aktivera personalliggare i ett projekt för att se det här
										</p>
										<Button
											variant='outline'
											onClick={() => (window.location.href = '/dashboard/projects')}
											className='rounded-full border border-[var(--color-gray-300)] px-6 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] dark:border-[#5b4b3c] dark:bg-[#252120] dark:text-[#f5eee6] dark:hover:border-[#f3c089] dark:hover:bg-[#2c2625]'
										>
											Gå till Projekt
										</Button>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value='checkin'>
							{selectedProject ? (
								<CheckInTab project={selectedProject} userId={userId} />
							) : (
								<Card className='rounded-2xl border border-border/60 bg-[var(--color-card)] shadow-sm dark:border-[#2d1b15] dark:bg-[#1b120d]'>
									<CardContent className='py-12 text-center'>
										<p className='text-muted-foreground dark:text-white/70'>Välj ett projekt från översikten</p>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value='control'>
							{selectedProject ? (
								<ControlTab projectId={selectedProject.id} />
							) : (
								<Card className='rounded-2xl border border-border/60 bg-[var(--color-card)] shadow-sm dark:border-[#2d1b15] dark:bg-[#1b120d]'>
									<CardContent className='py-12 text-center'>
										<p className='text-muted-foreground dark:text-white/70'>Välj ett projekt från översikten</p>
									</CardContent>
								</Card>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}

