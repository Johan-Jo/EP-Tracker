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
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<div className='px-4 py-6 md:px-8 space-y-6'>
				{/* Header */}
				<div className='space-y-2'>
					<h1 className='text-3xl font-bold tracking-tight text-foreground dark:text-white'>
						Personalliggare
					</h1>
					<p className='text-sm text-muted-foreground dark:text-white/70'>
						Översikt över alla projekt med aktiv personalliggare
					</p>
				</div>

				{/* Main Content with Tabs */}
				<Tabs defaultValue='overview' className='space-y-6'>
					<TabsList className='flex w-full flex-wrap items-center justify-start gap-2 rounded-full border border-border/60 bg-[var(--color-card)]/80 p-1 text-muted-foreground shadow-sm dark:border-[#3a251d] dark:bg-[#21140f] dark:text-white/70'>
						<TabsTrigger value='overview' className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'>
							Översikt
						</TabsTrigger>
						<TabsTrigger
							value='checkin'
							disabled={!selectedProject}
							className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'
						>
							Check-in
						</TabsTrigger>
						<TabsTrigger
							value='control'
							disabled={!selectedProject}
							className='rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none'
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
									<QrCode className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
									<h3 className='text-lg font-semibold mb-2'>Inga aktiva personalliggare</h3>
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

