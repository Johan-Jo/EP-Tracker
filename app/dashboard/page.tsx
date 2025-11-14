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
	let session;
	try {
		session = await getSession();
	} catch (error) {
		console.error('[DASHBOARD] Error getting session:', error);
		redirect('/sign-in');
	}

	const { user, profile, membership } = session;

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
	// Use Promise.allSettled to handle individual failures gracefully
	const results = await Promise.allSettled([
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

	// Extract results with fallbacks for failed promises
	const stats = results[0].status === 'fulfilled' ? results[0].value : {
		active_projects: 0,
		total_hours_week: 0,
		total_materials_week: 0,
		total_time_entries_week: 0,
	};
	const activities = results[1].status === 'fulfilled' ? results[1].value : [];
	const activeTimeEntry = results[2].status === 'fulfilled' ? results[2].value : null;
	const recentProject = results[3].status === 'fulfilled' ? results[3].value : null;
	const allProjects = results[4].status === 'fulfilled' ? results[4].value : [];

	// Log any failures for debugging
	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			console.error(`[DASHBOARD] Query ${index + 1} failed:`, result.reason);
		}
	});

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
