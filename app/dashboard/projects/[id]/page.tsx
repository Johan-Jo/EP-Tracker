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
import { ProjectTeamTab } from '@/components/projects/project-team-tab';
import { ProjectSummaryView } from '@/components/projects/project-summary-view';
import { ProjectAlertSettingsDisplay } from '@/components/projects/project-alert-settings-display';
import { FixedTimeBlocksCard } from '@/components/projects/fixed-time-blocks-card';

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

	// PERFORMANCE: Fetch project summary on server-side for instant page load
	// Use internal API call with supabase client instead of HTTP fetch
	let initialSummary = null;
	try {
		// Directly query data here instead of going through HTTP
		// This is faster and avoids cookie forwarding issues
		const [
			timeEntriesResult,
			materialsResult,
			expensesResult,
			mileageResult,
			projectMembersResult,
			activitiesResult,
		] = await Promise.all([
			supabase
				.from('time_entries')
				.select('id, user_id, phase_id, duration_min, profiles:user_id(id, full_name)')
				.eq('project_id', params.id),
			supabase
				.from('materials')
				.select('qty, unit_price_sek, total_sek')
				.eq('project_id', params.id),
			supabase
				.from('expenses')
				.select('amount')
				.eq('project_id', params.id),
			supabase
				.from('mileage')
				.select('distance_km, rate_per_km')
				.eq('project_id', params.id),
			supabase
				.from('project_members')
				.select('user_id, profiles:user_id(id, full_name)')
				.eq('project_id', params.id),
			supabase
				.from('activity_log')
				.select('*')
				.eq('project_id', params.id)
				.order('created_at', { ascending: false })
				.limit(10),
		]);

		const timeEntries = timeEntriesResult.data || [];
		const materials = materialsResult.data || [];
		const expenses = expensesResult.data || [];
		const mileageData = mileageResult.data || [];
		const projectMembers = projectMembersResult.data || [];
		const activities = activitiesResult.data || [];

		// Calculate statistics
		const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_min || 0), 0);
		const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
		
		const materialsTotal = materials.reduce((sum, m) => sum + (m.total_sek || 0), 0);
		const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
		const mileageTotal = mileageData.reduce((sum, m) => sum + (m.distance_km * m.rate_per_km), 0);
		const totalCosts = materialsTotal + expensesTotal + mileageTotal;

		const budgetHours = project.budget_hours || 0;
		const budgetAmount = project.budget_amount || 0;
		
		// Calculate hours per phase
		const phaseHoursMap = new Map<string, number>();
		timeEntries.forEach((entry: any) => {
			if (entry.phase_id) {
				const current = phaseHoursMap.get(entry.phase_id) || 0;
				phaseHoursMap.set(entry.phase_id, current + (entry.duration_min || 0) / 60);
			}
		});
		
		// Enrich phases with calculated data
		const enrichedPhases = (project.phases || []).map((phase: any) => {
			const loggedHours = Math.round((phaseHoursMap.get(phase.id) || 0) * 10) / 10;
			const phaseBudgetHours = phase.budget_hours || 0;
			const phaseBudgetAmount = phase.budget_amount || 0;
			
			return {
				id: phase.id,
				name: phase.name,
				sortOrder: phase.sort_order || 0,
				budgetHours: phaseBudgetHours,
				budgetAmount: phaseBudgetAmount,
				loggedHours,
				hoursPercentage: phaseBudgetHours > 0
					? Math.round((loggedHours / phaseBudgetHours) * 100)
					: 0,
			};
		});
		
		initialSummary = {
			project: {
				id: project.id,
				name: project.name,
				projectNumber: project.project_number,
				status: project.status,
				budgetMode: project.budget_mode,
				budgetHours,
				budgetAmount,
			},
			time: {
				totalHours,
				budgetHours,
				remainingHours: budgetHours - totalHours,
				percentage: budgetHours > 0 ? Math.round((totalHours / budgetHours) * 100) : 0,
				byUser: [],
			},
			costs: {
				materials: materialsTotal,
				expenses: expensesTotal,
				mileage: mileageTotal,
				total: totalCosts,
				budgetAmount,
				remaining: budgetAmount - totalCosts,
				percentage: budgetAmount > 0 ? Math.round((totalCosts / budgetAmount) * 100) : 0,
			},
			materials: {
				count: materials.length,
				totalCost: materialsTotal,
			},
			phases: enrichedPhases,
			team: projectMembers.map((pm: any) => ({
				userId: pm.user_id,
				userName: pm.profiles?.full_name || 'Okänd',
				role: 'Medlem',
				loggedHours: 0,
			})),
			activities,
			deadline: undefined,
		};
	} catch (error) {
		console.error('Error pre-fetching summary:', error);
		// Continue without initial summary - component will fetch it
	}

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
					</div>
				</div>

			{/* Project Summary - Full Page View (Figma Design) */}
			<div className='space-y-6'>
				<ProjectSummaryView 
					projectId={project.id} 
					canEdit={canEdit}
					projectName={project.name}
					projectNumber={project.project_number}
					clientName={project.client_name}
					siteAddress={project.site_address}
					status={project.status}
					budgetMode={project.budget_mode}
					budgetHours={project.budget_hours}
					budgetAmount={project.budget_amount}
					showEditButton={true}
					initialSummary={initialSummary}
				/>

				{/* Alert Settings Display - EPIC 25 Phase 2 */}
				{canEdit && (
					<ProjectAlertSettingsDisplay 
						alertSettings={project.alert_settings} 
						projectId={project.id}
						canEdit={canEdit}
					/>
				)}

				<FixedTimeBlocksCard
					projectId={project.id}
					canEdit={canEdit}
					billingMode={project.billing_mode}
					quotedAmountSek={project.quoted_amount_sek}
					projectHourlyRateSek={project.project_hourly_rate_sek}
				/>
			</div>

			{/* Legacy tabs (hidden for now, can be removed later) */}
			{false && (
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
					<ProjectTeamTab 
						projectId={project.id} 
						projectName={project.name}
						canEdit={canEdit}
					/>
				</TabsContent>
			</Tabs>
			)}
			</div>
		</div>
	);
}

