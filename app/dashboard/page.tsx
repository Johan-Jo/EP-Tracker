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

	const [projectsResult, timeEntriesResult, materialsResult, expensesResult, activeTimeEntry, recentProject, allProjects, recentTimeEntries, recentMaterials, recentExpenses, recentAta, recentDiary] = await Promise.all([
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
		// Fetch recent time entries with user info
		supabase
			.from('time_entries')
			.select('id, start_at, stop_at, created_at, user_id, projects(id, name), profiles!time_entries_user_id_fkey(full_name)')
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(10),
		// Fetch recent materials with user info
		supabase
			.from('materials')
			.select('id, description, quantity, unit, created_at, user_id, projects(id, name), profiles!materials_user_id_fkey(full_name)')
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(10),
		// Fetch recent expenses with user info
		supabase
			.from('expenses')
			.select('id, description, amount_sek, created_at, user_id, projects(id, name), profiles!expenses_user_id_fkey(full_name)')
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(10),
		// Fetch recent ATA with user info
		supabase
			.from('ata')
			.select('id, title, created_at, user_id, projects(id, name), profiles!ata_user_id_fkey(full_name)')
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(10),
		// Fetch recent diary entries with user info
		supabase
			.from('diary_entries')
			.select('id, title, created_at, user_id, projects(id, name), profiles!diary_entries_user_id_fkey(full_name)')
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(10),
	]);

	const stats = {
		projectsCount: projectsResult.count || 0,
		timeEntriesCount: timeEntriesResult.count || 0,
		materialsCount: (materialsResult.count || 0) + (expensesResult.count || 0),
	};

	// Combine all activities into a unified feed
	const activities = [
		...(recentTimeEntries.data || []).map(item => ({
			id: item.id,
			type: 'time' as const,
			created_at: item.created_at,
			project: Array.isArray(item.projects) ? item.projects[0] || null : item.projects,
			user_name: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
			data: item,
		})),
		...(recentMaterials.data || []).map(item => ({
			id: item.id,
			type: 'material' as const,
			created_at: item.created_at,
			project: Array.isArray(item.projects) ? item.projects[0] || null : item.projects,
			user_name: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
			data: item,
		})),
		...(recentExpenses.data || []).map(item => ({
			id: item.id,
			type: 'expense' as const,
			created_at: item.created_at,
			project: Array.isArray(item.projects) ? item.projects[0] || null : item.projects,
			user_name: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
			data: item,
		})),
		...(recentAta.data || []).map(item => ({
			id: item.id,
			type: 'ata' as const,
			created_at: item.created_at,
			project: Array.isArray(item.projects) ? item.projects[0] || null : item.projects,
			user_name: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
			data: item,
		})),
		...(recentDiary.data || []).map(item => ({
			id: item.id,
			type: 'diary' as const,
			created_at: item.created_at,
			project: Array.isArray(item.projects) ? item.projects[0] || null : item.projects,
			user_name: Array.isArray(item.profiles) ? item.profiles[0]?.full_name : item.profiles?.full_name,
			data: item,
		})),
	].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 15); // Show latest 15 activities

	return (
		<DashboardClient 
			userName={profile?.full_name || 'användare'} 
			stats={stats}
			activeTimeEntry={activeTimeEntry.data}
			recentProject={recentProject.data}
			allProjects={allProjects.data || []}
			recentActivities={activities}
			userId={user.id}
		/>
	);
}
