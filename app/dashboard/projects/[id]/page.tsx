import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ProjectDetailClient } from '@/components/projects/project-detail-client';

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
			customer:customers(*),
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
	const customerDisplayName = project.customer
		? project.customer.type === 'COMPANY'
			? project.customer.company_name
			: `${project.customer.first_name ?? ''} ${project.customer.last_name ?? ''}`.trim()
		: project.client_name;

	// Fetch initial summary data directly (same logic as API endpoint but without date filters for initial load)
	let initialSummary = null;
	try {
		const [
			timeEntriesResult,
			materialsResult,
			expensesResult,
			mileageResult,
			projectMembersResult,
			diaryEntriesResult,
		] = await Promise.all([
			supabase
				.from('time_entries')
				.select(`
					id,
					user_id,
					phase_id,
					start_at,
					duration_min,
					task_label,
					profiles:user_id (id, full_name),
					phase:phases (id, name)
				`)
				.eq('project_id', params.id)
				.eq('status', 'approved'),
			supabase
				.from('materials')
				.select('id, qty, unit_price_sek, total_sek, description, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved'),
			supabase
				.from('expenses')
				.select('id, amount, description, expense_date, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved'),
			supabase
				.from('mileage')
				.select('id, distance_km, rate_per_km, trip_date, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved'),
			supabase
				.from('project_members')
				.select('user_id, profiles:user_id (id, full_name)')
				.eq('project_id', params.id),
			supabase
				.from('diary_entries')
				.select('id, date, work_performed, created_by, weather, temperature_c, crew_count')
				.eq('project_id', params.id),
		]);

		const timeEntries = timeEntriesResult.data || [];
		const materials = materialsResult.data || [];
		const expenses = expensesResult.data || [];
		const mileage = mileageResult.data || [];
		const projectMembers = projectMembersResult.data || [];
		const diaryEntries = diaryEntriesResult.data || [];

		// Match diary entries with time entries
		const diaryMap = new Map<string, any>();
		diaryEntries.forEach((diary: any) => {
			const dateKey = diary.date;
			if (!diaryMap.has(dateKey)) {
				diaryMap.set(dateKey, diary);
			}
		});

		const processedTimeEntries = timeEntries.map((entry: any) => {
			const entryDate = new Date(entry.start_at).toISOString().split('T')[0];
			const matchedDiary = diaryMap.get(entryDate);
			
			return {
				id: entry.id,
				date: entryDate,
				user: {
					id: entry.user_id,
					name: (entry.profiles as any)?.full_name || 'Okänd',
				},
				phase: entry.phase ? {
					id: entry.phase.id,
					name: entry.phase.name,
				} : null,
				hours: Math.round((entry.duration_min || 0) / 6) / 10,
				taskLabel: entry.task_label,
				diary: matchedDiary ? {
					id: matchedDiary.id,
					work_performed: matchedDiary.work_performed,
					weather: matchedDiary.weather,
					temperature_c: matchedDiary.temperature_c,
					crew_count: matchedDiary.crew_count,
				} : null,
			};
		});

		const totalMinutes = timeEntries.reduce((sum: number, entry: any) => sum + (entry.duration_min || 0), 0);
		const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
		const materialsTotal = materials.reduce((sum: number, m: any) => sum + (m.total_sek || 0), 0);
		const expensesTotal = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
		const mileageTotal = mileage.reduce((sum: number, m: any) => sum + (m.distance_km * m.rate_per_km), 0);
		const totalCosts = materialsTotal + expensesTotal + mileageTotal;
		const budgetHours = project.budget_hours || 0;
		const budgetAmount = project.budget_amount || 0;

		initialSummary = {
			project: {
				id: project.id,
				name: project.name,
				projectNumber: project.project_number,
				status: project.status,
				budgetMode: project.budget_mode,
				budgetHours,
				budgetAmount,
				createdAt: project.created_at,
			},
			time: {
				totalHours,
				budgetHours,
				remainingHours: budgetHours - totalHours,
				percentage: budgetHours > 0 ? Math.round((totalHours / budgetHours) * 100) : 0,
				byUser: [],
			},
			timeEntries: processedTimeEntries,
			costs: {
				materials: materialsTotal,
				expenses: expensesTotal,
				mileage: mileageTotal,
				total: totalCosts,
				budgetAmount,
				remaining: budgetAmount - totalCosts,
				percentage: budgetAmount > 0 ? Math.round((totalCosts / budgetAmount) * 100) : 0,
			},
			costsByCategory: {
				materials: {
					total: materialsTotal,
					count: materials.length,
					items: materials.map((m: any) => ({
						id: m.id,
						description: m.description,
						qty: m.qty,
						unitPrice: m.unit_price_sek,
						total: m.total_sek,
						createdAt: m.created_at,
					})),
				},
				expenses: {
					total: expensesTotal,
					count: expenses.length,
					items: expenses.map((e: any) => ({
						id: e.id,
						description: e.description,
						amount: e.amount,
						expenseDate: e.expense_date,
						createdAt: e.created_at,
					})),
				},
				mileage: {
					total: mileageTotal,
					count: mileage.length,
					items: mileage.map((m: any) => ({
						id: m.id,
						distanceKm: m.distance_km,
						ratePerKm: m.rate_per_km,
						total: m.distance_km * m.rate_per_km,
						tripDate: m.trip_date,
						createdAt: m.created_at,
					})),
				},
				total: totalCosts,
			},
		};
	} catch (error) {
		console.error('Error pre-fetching summary:', error);
		// Continue without initial summary - component will fetch it
	}

	// Get project start date (created_at or use a default)
	const projectStartDate = project.created_at
		? new Date(project.created_at).toISOString().split('T')[0]
		: new Date().toISOString().split('T')[0];

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0 bg-gray-50 dark:bg-black'>
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

				<ProjectDetailClient
					projectId={project.id}
					canEdit={canEdit}
					projectName={project.name}
					projectNumber={project.project_number}
					clientName={customerDisplayName}
					customerId={project.customer_id}
					siteAddress={project.site_address}
					status={project.status}
					budgetMode={project.budget_mode}
					budgetHours={project.budget_hours}
					budgetAmount={project.budget_amount}
					projectStartDate={projectStartDate}
					phases={project.phases || []}
					initialSummary={initialSummary}
				/>
			</div>
		</div>
	);
}

