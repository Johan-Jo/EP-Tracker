import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { DashboardClient } from './dashboard-client';

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

	const [projectsResult, timeEntriesResult, materialsResult, expensesResult] = await Promise.all([
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
		/>
	);
}
