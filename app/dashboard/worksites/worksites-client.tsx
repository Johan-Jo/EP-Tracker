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
		<div className='flex-1 overflow-auto bg-gray-50 pb-20 transition-colors md:pb-0 dark:bg-[#0b0705]'>
			<div className='relative px-4 py-6 md:px-8'>
				<div className='pointer-events-none absolute inset-x-4 top-4 h-48 rounded-3xl bg-gradient-to-b from-orange-400/20 via-transparent to-transparent blur-3xl dark:from-orange-500/12 md:inset-x-8' />

				<div className='relative space-y-6'>
					{/* Header */}
					<div className='space-y-2'>
						<h1 className='text-3xl font-semibold tracking-tight text-foreground dark:text-white'>
							Personalliggare
						</h1>
						<p className='text-sm text-muted-foreground dark:text-white/70'>
							Översikt över alla projekt med aktiv personalliggare
						</p>
					</div>

					{/* Main Content with Tabs */}
					<Tabs defaultValue='overview' className='space-y-6'>
						<TabsList className='relative flex h-12 w-full flex-wrap items-center justify-between gap-2 rounded-full border border-border/60 bg-[linear-gradient(135deg,rgba(254,242,225,0.95),rgba(245,214,177,0.8))] px-2 py-1 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.5)] backdrop-blur dark:border-[#3a251d] dark:bg-[linear-gradient(135deg,rgba(58,41,30,0.92),rgba(30,20,15,0.88))] dark:text-white/70'>
							<TabsTrigger
								value='overview'
								className='flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-[linear-gradient(120deg,#f4d9b0,#e4b176)] data-[state=active]:text-[#3a2312] data-[state=active]:shadow-[0_10px_32px_-18px_rgba(240,210,167,0.9)] dark:data-[state=active]:text-[#2a1408]'
							>
								Översikt
							</TabsTrigger>
							<TabsTrigger
								value='checkin'
								disabled={!selectedProject}
								className='flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-[linear-gradient(120deg,#f4d9b0,#e4b176)] data-[state=active]:text-[#3a2312] data-[state=active]:shadow-[0_10px_32px_-18px_rgba(240,210,167,0.9)] disabled:opacity-40 dark:data-[state=active]:text-[#2a1408]'
							>
								Check-in
							</TabsTrigger>
							<TabsTrigger
								value='control'
								disabled={!selectedProject}
								className='flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-[linear-gradient(120deg,#f4d9b0,#e4b176)] data-[state=active]:text-[#3a2312] data-[state=active]:shadow-[0_10px_32px_-18px_rgba(240,210,167,0.9)] disabled:opacity-40 dark:data-[state=active]:text-[#2a1408]'
							>
								Kontrollvy
							</TabsTrigger>
						</TabsList>
						<TabsContent value='overview' className='space-y-4'>
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
								<Card className='rounded-2xl border-2 border-dashed border-border/60 bg-[var(--color-card)]/60 dark:border-[#3a251d] dark:bg-[#21140f]'>
									<CardContent className='py-12 text-center text-foreground dark:text-white'>
										<QrCode className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
										<h3 className='mb-2 text-lg font-semibold'>Inga aktiva personalliggare</h3>
										<p className='mb-4 text-sm text-muted-foreground dark:text-white/70'>
											Aktivera personalliggare i ett projekt för att se det här
										</p>
										<Button onClick={() => window.location.href = '/dashboard/projects'}>
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
	);
}

