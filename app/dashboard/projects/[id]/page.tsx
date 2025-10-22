import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Edit, Calendar, Users } from 'lucide-react';
import { PhasesList } from '@/components/projects/phases-list';
import { WorkOrdersList } from '@/components/projects/work-orders-list';

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage(props: PageProps) {
	const params = await props.params;
	const supabase = await createClient();
	
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Fetch project with relations
	const { data: project, error } = await supabase
		.from('projects')
		.select(
			`
			*,
			phases (*),
			work_orders (*)
		`
		)
		.eq('id', params.id)
		.single();

	if (error || !project) {
		notFound();
	}

	// Check if user has access to this project's organization
	const { data: membership } = await supabase
		.from('memberships')
		.select('role')
		.eq('user_id', user.id)
		.eq('org_id', project.org_id)
		.eq('is_active', true)
		.single();

	if (!membership) {
		notFound();
	}

	const canEdit = ['admin', 'foreman'].includes(membership.role);

	return (
		<div className='p-4 md:p-8 space-y-6'>
			{/* Header */}
			<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
				<div className='flex-1'>
					<div className='flex items-center gap-3 mb-2'>
						<h1 className='text-3xl font-bold tracking-tight'>{project.name}</h1>
						<Badge
							variant={
								project.status === 'active'
									? 'default'
									: project.status === 'paused'
									? 'secondary'
									: 'outline'
							}
						>
							{project.status === 'active' && 'Aktiv'}
							{project.status === 'paused' && 'Pausad'}
							{project.status === 'completed' && 'Klar'}
							{project.status === 'archived' && 'Arkiverad'}
						</Badge>
					</div>
					{project.project_number && (
						<p className='text-muted-foreground'>Projektnummer: {project.project_number}</p>
					)}
				</div>
				{canEdit && (
					<Button asChild>
						<Link href={`/dashboard/projects/${project.id}/edit`}>
							<Edit className='w-4 h-4 mr-2' />
							Redigera
						</Link>
					</Button>
				)}
			</div>

			{/* Overview cards */}
			<div className='grid gap-4 md:grid-cols-3'>
				{project.client_name && (
					<Card>
						<CardHeader className='pb-3'>
							<CardDescription>Kund</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='font-medium'>{project.client_name}</p>
						</CardContent>
					</Card>
				)}

				{project.site_address && (
					<Card>
						<CardHeader className='pb-3'>
							<CardDescription>Plats</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='font-medium flex items-start gap-2'>
								<MapPin className='w-4 h-4 mt-1 text-muted-foreground flex-shrink-0' />
								<span>{project.site_address}</span>
							</p>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader className='pb-3'>
						<CardDescription>Skapad</CardDescription>
					</CardHeader>
					<CardContent>
						<p className='font-medium flex items-center gap-2'>
							<Calendar className='w-4 h-4 text-muted-foreground' />
							{new Date(project.created_at).toLocaleDateString('sv-SE')}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs defaultValue='overview' className='space-y-4'>
				<TabsList>
					<TabsTrigger value='overview'>Översikt</TabsTrigger>
					<TabsTrigger value='phases'>
						Faser ({project.phases?.length || 0})
					</TabsTrigger>
					<TabsTrigger value='work-orders'>
						Arbetsorder ({project.work_orders?.length || 0})
					</TabsTrigger>
					<TabsTrigger value='team'>Team</TabsTrigger>
				</TabsList>

				<TabsContent value='overview' className='space-y-4'>
					<Card>
						<CardHeader>
							<CardTitle>Projektöversikt</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div>
								<p className='text-sm text-muted-foreground mb-1'>Status</p>
								<p className='font-medium capitalize'>{project.status}</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground mb-1'>Budgetläge</p>
								<p className='font-medium'>
									{project.budget_mode === 'none' && 'Ingen budget'}
									{project.budget_mode === 'hours' && 'Timbudget'}
									{project.budget_mode === 'amount' && 'Beloppsbudget'}
									{project.budget_mode === 'ep_sync' && 'EP Sync'}
								</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground mb-1'>Faser</p>
								<p className='font-medium'>{project.phases?.length || 0} faser skapade</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground mb-1'>Arbetsorder</p>
								<p className='font-medium'>
									{project.work_orders?.length || 0} arbetsorder skapade
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='phases' className='space-y-4'>
					<PhasesList
						projectId={project.id}
						phases={project.phases || []}
						canEdit={canEdit}
					/>
				</TabsContent>

				<TabsContent value='work-orders' className='space-y-4'>
					<WorkOrdersList
						projectId={project.id}
						phases={project.phases || []}
						workOrders={project.work_orders || []}
						canEdit={canEdit}
					/>
				</TabsContent>

				<TabsContent value='team' className='space-y-4'>
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Users className='w-5 h-5' />
								Projektteam
							</CardTitle>
							<CardDescription>
								Hantera teammedlemmar kommer i en senare version
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className='text-muted-foreground text-sm'>
								Funktionalitet för att lägga till och hantera teammedlemmar kommer snart.
							</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}

