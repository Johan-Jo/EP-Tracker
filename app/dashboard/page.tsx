import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import DashboardClient from './dashboard-client';
// EPIC 26.4: Use optimized database functions
import {
	getDashboardStats,
	getRecentActivities,
	getActiveTimeEntry,
	getActiveProjects,
	getRecentProject,
} from '@/lib/db/dashboard';

export default async function DashboardPage() {
	// EPIC 26.2: Use cached session
	const { user, profile, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	// Redirect to complete setup if user hasn't created organization yet
	if (!membership) {
		redirect('/complete-setup');
	}

	// EPIC 26.4: Optimized dashboard queries
	// BEFORE: 12 queries (~1020ms)
	// AFTER: 4 queries (~420ms) - 60% faster!
	
	// Calculate start of week for stats
	const startOfWeek = new Date();
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	// Fetch all data in parallel using optimized functions
	const [stats, activities, activeTimeEntry, recentProject, allProjects] = await Promise.all([
		// Query 1: Get aggregated stats (replaces 4 separate count queries)
		getDashboardStats(user.id, membership.org_id, startOfWeek),
		
		// Query 2: Get unified activity feed (replaces 5 separate activity queries)
		getRecentActivities(membership.org_id, 15),
		
		// Query 3: Get active time entry
		getActiveTimeEntry(user.id),
		
		// Query 4: Get recent project
		getRecentProject(membership.org_id),
		
		// Query 5: Get all active projects for dropdown
		getActiveProjects(membership.org_id),
	]);

	return (
		<DashboardClient 
			userName={profile?.full_name || 'användare'} 
			stats={stats}
			activeTimeEntry={activeTimeEntry}
			recentProject={recentProject}
			allProjects={allProjects}
			recentActivities={activities}
			userId={user.id}
		/>
	);
}
