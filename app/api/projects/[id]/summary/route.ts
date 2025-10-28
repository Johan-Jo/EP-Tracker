import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

interface Params {
	id: string;
}

/**
 * GET /api/projects/[id]/summary
 * 
 * Fetch comprehensive project summary including:
 * - Project details with phases
 * - Time statistics (total logged, by user, by phase)
 * - Financial statistics (materials, expenses, mileage)
 * - Team members with their logged hours
 * - Recent activities
 * - Material summary
 */
export async function GET(
	request: NextRequest,
	context: { params: Promise<Params> }
) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const params = await context.params;
	const projectId = params.id;

	const supabase = await createClient();

	// 1. Fetch project with phases
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select(`
			*,
			phases (
				id,
				name,
				sort_order,
				budget_hours,
				budget_amount
			)
		`)
		.eq('id', projectId)
		.eq('org_id', membership.org_id)
		.single();

	if (projectError || !project) {
		return NextResponse.json({ error: 'Project not found' }, { status: 404 });
	}

	// 2. Fetch time entries grouped by user and phase
	const { data: timeEntries } = await supabase
		.from('time_entries')
		.select(`
			id,
			user_id,
			phase_id,
			start_at,
			stop_at,
			duration_min,
			profiles:user_id (
				id,
				full_name
			)
		`)
		.eq('project_id', projectId);

	// 3. Calculate time statistics
	const totalMinutes = timeEntries?.reduce((sum, entry) => {
		return sum + (entry.duration_min || 0);
	}, 0) || 0;

	const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

	// Group by user
	const userHoursMap = new Map<string, { userId: string; userName: string; hours: number }>();
	timeEntries?.forEach((entry) => {
		const userId = entry.user_id;
		const userName = (entry.profiles as any)?.full_name || 'Okänd';
		const hours = (entry.duration_min || 0) / 60;

		if (userHoursMap.has(userId)) {
			const existing = userHoursMap.get(userId)!;
			existing.hours += hours;
		} else {
			userHoursMap.set(userId, { userId, userName, hours });
		}
	});

	const teamHours = Array.from(userHoursMap.values()).map(item => ({
		userId: item.userId,
		userName: item.userName,
		hours: Math.round(item.hours * 10) / 10,
	}));

	// Group by phase
	const phaseHoursMap = new Map<string, number>();
	timeEntries?.forEach((entry) => {
		if (entry.phase_id) {
			const current = phaseHoursMap.get(entry.phase_id) || 0;
			phaseHoursMap.set(entry.phase_id, current + (entry.duration_min || 0) / 60);
		}
	});

	// 4. Fetch materials statistics
	const { data: materials } = await supabase
		.from('materials')
		.select('qty, unit_price_sek, total_sek')
		.eq('project_id', projectId);

	const materialsStats = {
		count: materials?.length || 0,
		totalCost: materials?.reduce((sum, m) => sum + (m.total_sek || 0), 0) || 0,
	};

	// 5. Fetch expenses statistics
	const { data: expenses } = await supabase
		.from('expenses')
		.select('amount')
		.eq('project_id', projectId);

	const expensesTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

	// 6. Fetch mileage statistics
	const { data: mileage } = await supabase
		.from('mileage')
		.select('distance_km, rate_per_km')
		.eq('project_id', projectId);

	const mileageTotal = mileage?.reduce((sum, m) => sum + (m.distance_km * m.rate_per_km), 0) || 0;

	// 7. Total costs
	const totalCosts = materialsStats.totalCost + expensesTotal + mileageTotal;

	// 8. Calculate budget used percentage
	const budgetHours = project.budget_hours || 0;
	const budgetAmount = project.budget_amount || 0;

	const hoursPercentage = budgetHours > 0 ? Math.round((totalHours / budgetHours) * 100) : 0;
	const costsPercentage = budgetAmount > 0 ? Math.round((totalCosts / budgetAmount) * 100) : 0;

	// 9. Fetch recent activities (last 10) - optimized to only fetch what we need
	const { data: activities } = await supabase
		.rpc('get_recent_activities_fast', {
			p_org_id: membership.org_id,
			p_limit: 20, // Reduced from 50 to 20
		});

	// Filter activities for this project only
	const projectActivities = activities
		?.filter((a: any) => a.project_id === projectId)
		.slice(0, 10) || [];

	// 10. Fetch team members from project_members + memberships for role
	const { data: projectMembers } = await supabase
		.from('project_members')
		.select(`
			user_id,
			profiles:user_id (
				id,
				full_name
			)
		`)
		.eq('project_id', projectId);

	// Get membership roles for these users
	const userIds = projectMembers?.map(pm => pm.user_id) || [];
	const { data: memberships } = await supabase
		.from('memberships')
		.select('user_id, role')
		.eq('org_id', membership.org_id)
		.in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

	const teamMembers = projectMembers?.map((pm) => {
		const userMembership = memberships?.find(m => m.user_id === pm.user_id);
		const roleMap: Record<string, string> = {
			admin: 'Administratör',
			foreman: 'Arbetsledare',
			worker: 'Arbetare',
			finance: 'Ekonomi',
		};
		
		return {
			userId: pm.user_id,
			userName: (pm.profiles as any)?.full_name || 'Okänd',
			role: roleMap[userMembership?.role || 'worker'] || 'Arbetare',
			loggedHours: teamHours.find(t => t.userId === pm.user_id)?.hours || 0,
		};
	}) || [];

	// 11. Enhance phases with logged hours
	const phasesWithHours = project.phases?.map((phase: any) => ({
		...phase,
		loggedHours: Math.round((phaseHoursMap.get(phase.id) || 0) * 10) / 10,
		budgetHours: phase.budget_hours || 0,
		budgetAmount: phase.budget_amount || 0,
		hoursPercentage: phase.budget_hours > 0
			? Math.round(((phaseHoursMap.get(phase.id) || 0) / phase.budget_hours) * 100)
			: 0,
	})) || [];

	// 12. Calculate deadline info
	let deadlineInfo = null;
	if (project.estimated_end_date) {
		const deadline = new Date(project.estimated_end_date);
		const today = new Date();
		const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		
		deadlineInfo = {
			date: project.estimated_end_date,
			daysRemaining,
			isPastDue: daysRemaining < 0,
		};
	}

	// 13. Build summary response
	const summary = {
		project: {
			id: project.id,
			name: project.name,
			projectNumber: project.project_number,
			status: project.status,
			clientName: project.client_name,
			siteAddress: project.site_address,
			budgetMode: project.budget_mode,
			budgetHours,
			budgetAmount,
			estimatedEndDate: project.estimated_end_date,
		},
		time: {
			totalHours,
			budgetHours,
			remainingHours: budgetHours - totalHours,
			percentage: hoursPercentage,
			byUser: teamHours,
		},
		costs: {
			materials: materialsStats.totalCost,
			expenses: expensesTotal,
			mileage: mileageTotal,
			total: totalCosts,
			budgetAmount,
			remaining: budgetAmount - totalCosts,
			percentage: costsPercentage,
		},
		materials: {
			count: materialsStats.count,
			totalCost: materialsStats.totalCost,
		},
		phases: phasesWithHours,
		team: teamMembers,
		activities: projectActivities,
		deadline: deadlineInfo,
	};

	return NextResponse.json(summary, {
		headers: {
			'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
		},
	});
}

// Enable ISR with 10 second revalidation
export const revalidate = 10;

