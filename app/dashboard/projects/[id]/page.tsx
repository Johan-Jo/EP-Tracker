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

	// ✅ PERFORMANCE: Select only needed columns instead of *
	// Reduces payload size significantly
	const { data: project, error } = await supabase
		.from('projects')
		.select(
			`
			id,
			org_id,
			name,
			project_number,
			client_name,
			customer_id,
			site_address,
			status,
			budget_mode,
			budget_hours,
			budget_amount,
			created_at,
			updated_at,
			is_archived,
			archived_at,
			archived_by,
			customer:customers!projects_customer_id_fkey(id, type, company_name, first_name, last_name),
			phases(id, name, sort_order, budget_hours, budget_amount)
		`
		)
		.eq('id', params.id)
		.single();

	if (error) {
		console.error('[Project Detail] Error fetching project:', error);
		console.error('[Project Detail] Error details:', {
			code: error.code,
			message: error.message,
			details: error.details,
			hint: error.hint,
		});
		notFound();
	}

	if (!project) {
		console.error('[Project Detail] Project not found:', params.id);
		notFound();
	}

	// Check if user has access to this project's organization

	const { data: membership, error: membershipError } = await supabase
		.from('memberships')
		.select('role')
		.eq('user_id', user.id)
		.eq('org_id', project.org_id)
		.eq('is_active', true)
		.single();

	if (membershipError) {
		console.error('[Project Detail] Error fetching membership:', membershipError);
		console.error('[Project Detail] Membership error details:', {
			code: membershipError.code,
			message: membershipError.message,
			details: membershipError.details,
			hint: membershipError.hint,
		});
	}

	if (!membership) {
		console.error('[Project Detail] User has no access to project org:', {
			userId: user.id,
			projectId: params.id,
			orgId: project.org_id
		});
		notFound();
	}

	const canEdit = ['admin', 'foreman'].includes(membership.role);
	const isAdmin = membership.role === 'admin';
	const isArchived = project.is_archived || false;
	// Handle customer as array or object (Supabase can return either)
	const customer = Array.isArray(project.customer) ? project.customer[0] : project.customer;
	const customerDisplayName = customer
		? customer.type === 'COMPANY'
			? customer.company_name
			: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
		: project.client_name;

	// ✅ PERFORMANCE FIX: Fetch initial summary with date filter (last 3 months) and limits
	// This prevents loading thousands of rows for large projects
	// User can expand date range via date filter if needed
	let initialSummary = null;
	try {
		// Default to last 3 months for initial load (much faster!)
		const threeMonthsAgo = new Date();
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
		const defaultStartDate = threeMonthsAgo.toISOString().split('T')[0];
		const defaultEndDate = new Date().toISOString().split('T')[0];

		// Add timeout to prevent hanging queries (10 seconds max)
		const queryTimeout = new Promise((_, reject) => {
			setTimeout(() => reject(new Error('Query timeout')), 10000);
		});

		const [
			timeEntriesResult,
			materialsResult,
			expensesResult,
			mileageResult,
			projectMembersResult,
			diaryEntriesResult,
		] = await Promise.race([
			Promise.all([
			// ✅ OPTIMIZED: Add date filter and limit for initial load
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
				.eq('status', 'approved')
				.gte('start_at', defaultStartDate)
				.lte('start_at', `${defaultEndDate}T23:59:59`)
				.order('start_at', { ascending: false })
				.limit(500), // Limit to 500 most recent entries
			// ✅ OPTIMIZED: Add date filter and limit
			supabase
				.from('materials')
				.select('id, qty, unit_price_sek, total_sek, description, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved')
				.gte('created_at', defaultStartDate)
				.lte('created_at', `${defaultEndDate}T23:59:59`)
				.order('created_at', { ascending: false })
				.limit(200), // Limit to 200 most recent
			// ✅ OPTIMIZED: Add date filter and limit
			supabase
				.from('expenses')
				.select('id, amount_sek, description, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved')
				.gte('created_at', defaultStartDate)
				.lte('created_at', `${defaultEndDate}T23:59:59`)
				.order('created_at', { ascending: false })
				.limit(200), // Limit to 200 most recent
			// ✅ OPTIMIZED: Add date filter and limit
			supabase
				.from('mileage')
				.select('id, km, rate_per_km_sek, date, created_at')
				.eq('project_id', params.id)
				.eq('status', 'approved')
				.gte('date', defaultStartDate)
				.lte('date', defaultEndDate)
				.order('date', { ascending: false })
				.limit(200), // Limit to 200 most recent
			supabase
				.from('project_members')
				.select('user_id, profiles:user_id (id, full_name)')
				.eq('project_id', params.id),
			// ✅ OPTIMIZED: Add date filter and limit
			supabase
				.from('diary_entries')
				.select('id, date, work_performed, created_by, weather, temperature_c, crew_count')
				.eq('project_id', params.id)
				.gte('date', defaultStartDate)
				.lte('date', defaultEndDate)
				.order('date', { ascending: false })
				.limit(100), // Limit to 100 most recent
			]),
			queryTimeout,
		]) as any;

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
		const expensesTotal = expenses.reduce((sum: number, e: any) => sum + (e.amount_sek || 0), 0);
		const mileageTotal = mileage.reduce((sum: number, m: any) => sum + ((m.km || 0) * (m.rate_per_km_sek || 0)), 0);
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
						amount: e.amount_sek,
						expenseDate: e.created_at?.split('T')[0] || null,
						createdAt: e.created_at,
					})),
				},
				mileage: {
					total: mileageTotal,
					count: mileage.length,
					items: mileage.map((m: any) => ({
						id: m.id,
						distanceKm: m.km,
						ratePerKm: m.rate_per_km_sek,
						total: (m.km || 0) * (m.rate_per_km_sek || 0),
						tripDate: m.date,
						createdAt: m.created_at,
					})),
				},
				total: totalCosts,
			},
		};
	} catch (error: any) {
		console.error('[Project Detail] Error pre-fetching summary:', error);
		console.error('[Project Detail] Summary error details:', {
			message: error?.message,
			name: error?.name,
			stack: error?.stack?.substring(0, 500),
		});
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
					isAdmin={isAdmin}
					isArchived={isArchived}
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

