import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Edit, Calendar, Users, Building2, Clock, DollarSign, TrendingUp, FolderKanban, FileText } from 'lucide-react';
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
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<div className='px-4 md:px-8 py-6 space-y-6'>
				{/* Breadcrumb */}
				<nav className='flex items-center gap-2 text-sm text-muted-foreground'>
					<Link href='/dashboard' className='hover:text-foreground transition-colors'>
						Dashboard
					</Link>
					<span>/</span>
					<Link href='/dashboard/projects' className='hover:text-foreground transition-colors'>
						Projekt
					</Link>
					<span>/</span>
					<span className='text-foreground font-medium'>{project.name}</span>
				</nav>

				{/* Hero Header with Gradient */}
				<div className='bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent border-2 border-orange-100 rounded-2xl p-6 md:p-8'>
					<div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
						<div className='flex-1'>
							<div className='flex items-center gap-3 mb-3'>
								<h1 className='text-3xl md:text-4xl font-bold tracking-tight text-gray-900'>
									{project.name}
								</h1>
								<Badge
									className={
										project.status === 'active'
											? 'bg-green-500 hover:bg-green-600'
											: project.status === 'paused'
											? 'bg-yellow-500 hover:bg-yellow-600'
											: project.status === 'completed'
											? 'bg-blue-500 hover:bg-blue-600'
											: 'bg-gray-500 hover:bg-gray-600'
									}
								>
									{project.status === 'active' && 'Aktiv'}
									{project.status === 'paused' && 'Pausad'}
									{project.status === 'completed' && 'Klar'}
									{project.status === 'archived' && 'Arkiverad'}
								</Badge>
							</div>
							{project.project_number && (
								<p className='text-sm text-gray-600 font-medium bg-white/60 inline-block px-3 py-1 rounded-lg'>
									Projektnummer: {project.project_number}
								</p>
							)}
						</div>
						{canEdit && (
							<Button asChild className='bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'>
								<Link href={`/dashboard/projects/${project.id}/edit`}>
									<Edit className='w-4 h-4 mr-2' />
									Redigera projekt
								</Link>
							</Button>
						)}
					</div>
				</div>

				{/* Overview Cards with Icons */}
				<div className='grid gap-4 md:grid-cols-4'>
					{project.client_name && (
						<Card className='border-2 hover:border-orange-200 transition-colors'>
							<CardHeader className='pb-3'>
								<div className='flex items-center gap-2'>
									<div className='p-2 bg-blue-100 rounded-lg'>
										<Building2 className='w-4 h-4 text-blue-600' />
									</div>
									<CardDescription className='text-xs'>Kund</CardDescription>
								</div>
							</CardHeader>
							<CardContent>
								<p className='font-semibold text-lg'>{project.client_name}</p>
							</CardContent>
						</Card>
					)}

					{project.site_address && (
						<Card className='border-2 hover:border-orange-200 transition-colors'>
							<CardHeader className='pb-3'>
								<div className='flex items-center gap-2'>
									<div className='p-2 bg-green-100 rounded-lg'>
										<MapPin className='w-4 h-4 text-green-600' />
									</div>
									<CardDescription className='text-xs'>Plats</CardDescription>
								</div>
							</CardHeader>
							<CardContent>
								<p className='font-semibold text-lg line-clamp-2'>{project.site_address}</p>
							</CardContent>
						</Card>
					)}

					<Card className='border-2 hover:border-orange-200 transition-colors'>
						<CardHeader className='pb-3'>
							<div className='flex items-center gap-2'>
								<div className='p-2 bg-purple-100 rounded-lg'>
									<Calendar className='w-4 h-4 text-purple-600' />
								</div>
								<CardDescription className='text-xs'>Skapad</CardDescription>
							</div>
						</CardHeader>
						<CardContent>
							<p className='font-semibold text-lg'>
								{new Date(project.created_at).toLocaleDateString('sv-SE')}
							</p>
						</CardContent>
					</Card>

					<Card className='border-2 hover:border-orange-200 transition-colors'>
						<CardHeader className='pb-3'>
							<div className='flex items-center gap-2'>
								<div className='p-2 bg-orange-100 rounded-lg'>
									<TrendingUp className='w-4 h-4 text-orange-600' />
								</div>
								<CardDescription className='text-xs'>Status</CardDescription>
							</div>
						</CardHeader>
						<CardContent>
							<p className='font-semibold text-lg capitalize'>
								{project.status === 'active' && 'Pågående'}
								{project.status === 'paused' && 'Pausad'}
								{project.status === 'completed' && 'Slutförd'}
								{project.status === 'archived' && 'Arkiverad'}
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

				<TabsContent value='overview' className='space-y-6'>
					{/* Budget Overview */}
					<div className='grid gap-4 md:grid-cols-3'>
						<Card className='border-2'>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<CardTitle className='text-sm font-medium text-muted-foreground'>
										Budgetläge
									</CardTitle>
									<DollarSign className='w-5 h-5 text-orange-500' />
								</div>
							</CardHeader>
							<CardContent>
								<p className='text-2xl font-bold text-gray-900'>
									{project.budget_mode === 'none' && 'Ingen budget'}
									{project.budget_mode === 'hours' && 'Timbudget'}
									{project.budget_mode === 'amount' && 'Beloppsbudget'}
									{project.budget_mode === 'ep_sync' && 'EP Sync'}
								</p>
								{project.budget_hours && (
									<p className='text-sm text-muted-foreground mt-2'>
										{project.budget_hours}h totalt
									</p>
								)}
								{project.budget_amount && (
									<p className='text-sm text-muted-foreground mt-2'>
										{project.budget_amount.toLocaleString('sv-SE')} kr totalt
									</p>
								)}
							</CardContent>
						</Card>

						<Card className='border-2'>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<CardTitle className='text-sm font-medium text-muted-foreground'>
										Faser
									</CardTitle>
									<FolderKanban className='w-5 h-5 text-blue-500' />
								</div>
							</CardHeader>
							<CardContent>
								<p className='text-2xl font-bold text-gray-900'>
									{project.phases?.length || 0}
								</p>
								<p className='text-sm text-muted-foreground mt-2'>
									{project.phases?.length === 1 ? 'fas skapad' : 'faser skapade'}
								</p>
							</CardContent>
						</Card>

						<Card className='border-2'>
							<CardHeader className='pb-3'>
								<div className='flex items-center justify-between'>
									<CardTitle className='text-sm font-medium text-muted-foreground'>
										Arbetsorder
									</CardTitle>
									<FileText className='w-5 h-5 text-green-500' />
								</div>
							</CardHeader>
							<CardContent>
								<p className='text-2xl font-bold text-gray-900'>
									{project.work_orders?.length || 0}
								</p>
								<p className='text-sm text-muted-foreground mt-2'>
									{project.work_orders?.length === 1 ? 'arbetsorder skapad' : 'arbetsorder skapade'}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Phases Overview */}
					<PhasesList
						projectId={project.id}
						phases={project.phases || []}
						canEdit={canEdit}
						projectBudgetHours={project.budget_hours}
						projectBudgetAmount={project.budget_amount}
					/>
				</TabsContent>

				<TabsContent value='phases' className='space-y-4'>
					<PhasesList
						projectId={project.id}
						phases={project.phases || []}
						canEdit={canEdit}
						projectBudgetHours={project.budget_hours}
						projectBudgetAmount={project.budget_amount}
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
		</div>
	);
}

