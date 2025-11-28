import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import ProjectsClient from './projects-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectsPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Use cached session
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode (getSession returns fake user for demo)
	if (!inDemoMode && !user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<Card>
					<CardHeader>
						<CardTitle>Inga organisationer hittades</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Du behöver vara medlem i en organisation för att skapa projekt.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();
	const search = typeof searchParams.search === 'string' ? searchParams.search : '';
	const status = typeof searchParams.status === 'string' ? searchParams.status : 'active';

	// ✅ PERFORMANCE: Select only needed columns instead of *
	// Reduces payload size by ~30-40%
	let query = supabase
		.from('projects')
		.select(`
			id,
			name,
			project_number,
			client_name,
			site_address,
			status,
			budget_hours,
			budget_amount,
			created_at,
			phases(count)
		`)
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false })
		.limit(500); // ✅ PERFORMANCE: Limit to prevent loading too many projects

	// Apply filters
	if (status && status !== 'all') {
		query = query.eq('status', status);
	}

	if (search) {
		query = query.or(
			`name.ilike.%${search}%,project_number.ilike.%${search}%,client_name.ilike.%${search}%`
		);
	}

	const { data: projects, error } = await query;

	if (error) {
		console.error('Error fetching projects:', error);
	}

	if (!projects || projects.length === 0) {
		const canCreateProjects = membership.role === 'admin' || membership.role === 'foreman';
		return (
			<ProjectsClient 
				projects={[]} 
				canCreateProjects={canCreateProjects}
				search={search}
				status={status}
			/>
		);
	}

	// ✅ PERFORMANCE: Batch queries instead of N+1 pattern
	// Fetch all time entries and phases in 2 queries instead of N*2 queries
	const projectIds = projects.map(p => p.id);

	// Batch fetch all time entries for all projects
	const { data: allTimeEntries, error: timeError } = await supabase
		.from('time_entries')
		.select('project_id, duration_min, ata_id, status')
		.in('project_id', projectIds)
		.eq('status', 'approved'); // Only count approved entries

	if (timeError) {
		console.error('Error fetching time entries:', timeError);
	}

	// Batch fetch all phases for all projects
	const { data: allPhases, error: phasesError } = await supabase
		.from('phases')
		.select('project_id, budget_hours, budget_amount')
		.in('project_id', projectIds);

	if (phasesError) {
		console.error('Error fetching phases:', phasesError);
	}

	// ✅ PERFORMANCE: Calculate totals in memory (much faster than N queries)
	// Group time entries and phases by project_id
	const timeEntriesByProject = new Map<string, typeof allTimeEntries>();
	const phasesByProject = new Map<string, typeof allPhases>();

	(allTimeEntries || []).forEach(entry => {
		if (!timeEntriesByProject.has(entry.project_id)) {
			timeEntriesByProject.set(entry.project_id, []);
		}
		timeEntriesByProject.get(entry.project_id)!.push(entry);
	});

	(allPhases || []).forEach(phase => {
		if (!phasesByProject.has(phase.project_id)) {
			phasesByProject.set(phase.project_id, []);
		}
		phasesByProject.get(phase.project_id)!.push(phase);
	});

	// Calculate totals for each project
	const projectsWithHours = projects.map((project) => {
		const projectTimeEntries = timeEntriesByProject.get(project.id) || [];
		const projectPhases = phasesByProject.get(project.id) || [];

		// ✅ PERFORMANCE: Use duration_min instead of calculating from start_at/stop_at
		// This is much faster and more accurate
		const totalMinutes = projectTimeEntries.reduce((sum, entry) => {
			const duration = entry.duration_min || 0;
			// If this entry is for an ÄTA, subtract it from the total
			// (ÄTA entries are logged on the project but should reduce the project total)
			if (entry.ata_id) {
				return sum - duration; // Subtract ÄTA time
			}
			return sum + duration;
		}, 0);

		const totalHours = totalMinutes / 60;

		// Sum up budget from phases
		const phasesBudgetHours = projectPhases.reduce((sum, phase) => {
			return sum + (phase.budget_hours || 0);
		}, 0);
		const phasesBudgetAmount = projectPhases.reduce((sum, phase) => {
			return sum + (phase.budget_amount || 0);
		}, 0);

		// If there are phases with budgets, use the sum of phases' budgets
		// Otherwise, fall back to the project's direct budget
		const effectiveBudgetHours = (phasesBudgetHours > 0) ? phasesBudgetHours : project.budget_hours;
		const effectiveBudgetAmount = (phasesBudgetAmount > 0) ? phasesBudgetAmount : project.budget_amount;

		return {
			...project,
			total_hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
			budget_hours: effectiveBudgetHours,
			budget_amount: effectiveBudgetAmount,
		};
	});

	const canCreateProjects = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<ProjectsClient 
			projects={projectsWithHours || []} 
			canCreateProjects={canCreateProjects}
			search={search}
			status={status}
		/>
	);
}

