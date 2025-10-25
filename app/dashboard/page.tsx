import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
	// Use cached session
	const { user, profile, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	// Redirect to complete setup if user hasn't created organization yet
	if (!membership) {
		redirect('/complete-setup');
	}

	const supabase = await createClient();

	// Fetch stats in parallel for better performance
	const startOfWeek = new Date();
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	const [projectsResult, timeEntriesResult, materialsResult, expensesResult, activeTimeEntry, recentProject, allProjects, recentActivities] = await Promise.all([
		supabase
			.from('projects')
			.select('*', { count: 'exact', head: true })
			.eq('org_id', membership.org_id),
		supabase
			.from('time_entries')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('start_at', startOfWeek.toISOString()),
		supabase
			.from('materials')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('created_at', startOfWeek.toISOString()),
		supabase
			.from('expenses')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('created_at', startOfWeek.toISOString()),
		// Fetch active time entry (where stop_at is null)
		supabase
			.from('time_entries')
			.select('*, projects(id, name)')
			.eq('user_id', user.id)
			.is('stop_at', null)
			.order('start_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		// Fetch most recent project
		supabase
			.from('projects')
			.select('id, name')
			.eq('org_id', membership.org_id)
			.eq('status', 'active')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
		// Fetch all active projects for dropdown
		supabase
			.from('projects')
			.select('id, name')
			.eq('org_id', membership.org_id)
			.eq('status', 'active')
			.order('name', { ascending: true }),
		// Fetch recent time entries for activity feed
		supabase
			.from('time_entries')
			.select('id, start_at, stop_at, created_at, projects(id, name)')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(10),
	]);

	const stats = {
		projectsCount: projectsResult.count || 0,
		timeEntriesCount: timeEntriesResult.count || 0,
		materialsCount: (materialsResult.count || 0) + (expensesResult.count || 0),
	};

	return (
		<DashboardClient 
			userName={profile?.full_name || 'användare'} 
			stats={stats}
			activeTimeEntry={activeTimeEntry.data}
			recentProject={recentProject.data}
			allProjects={allProjects.data || []}
			recentActivities={recentActivities.data || []}
			userId={user.id}
		/>
	);
}
