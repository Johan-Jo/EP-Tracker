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
			<div className='px-4 md:px-8 py-6 space-y-6'>
				{/* Header */}
				<div>
					<div className='flex items-center justify-between mb-2'>
						<h1 className='text-3xl md:text-4xl font-bold tracking-tight'>Personalliggare</h1>
					</div>
					<p className='text-muted-foreground'>
						Översikt över alla projekt med aktiv personalliggare
					</p>
				</div>

				{/* Main Content with Tabs */}
				<Tabs defaultValue='overview' className='space-y-6'>
					<TabsList>
						<TabsTrigger value='overview'>Översikt</TabsTrigger>
						<TabsTrigger value='checkin' disabled={!selectedProject}>
							Check-in
						</TabsTrigger>
						<TabsTrigger value='control' disabled={!selectedProject}>
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
							<Card className='border-2 border-dashed'>
								<CardContent className='py-12 text-center'>
									<QrCode className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
									<h3 className='text-lg font-semibold mb-2'>Inga aktiva personalliggare</h3>
									<p className='text-sm text-muted-foreground mb-4'>
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
							<Card>
								<CardContent className='py-12 text-center'>
									<p className='text-muted-foreground'>Välj ett projekt från översikten</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>

					<TabsContent value='control'>
						{selectedProject ? (
							<ControlTab projectId={selectedProject.id} />
						) : (
							<Card>
								<CardContent className='py-12 text-center'>
									<p className='text-muted-foreground'>Välj ett projekt från översikten</p>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

