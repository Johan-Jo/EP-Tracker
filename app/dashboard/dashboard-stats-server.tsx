/**
 * EPIC 26.7: Server Component for Dashboard Stats
 * Fetches stats data asynchronously for Streaming SSR
 */
import { getDashboardStats } from '@/lib/db/dashboard';
import { getSession } from '@/lib/auth/get-session';

export async function DashboardStatsServer() {
	const { user, membership } = await getSession();
	
	if (!user || !membership) {
		return null;
	}

	// Calculate start of week for stats
	const startOfWeek = new Date();
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	const stats = await getDashboardStats(user.id, membership.org_id, startOfWeek);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Active Projects */}
			<div className="rounded-xl border bg-card p-6">
				<div className="flex items-center justify-between space-y-0 pb-2">
					<h3 className="text-sm font-medium text-muted-foreground">
						Aktiva projekt
					</h3>
					<svg 
						className="h-4 w-4 text-muted-foreground" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
				</div>
				<div className="mt-2">
					<p className="text-3xl font-bold">{stats.active_projects}</p>
					<p className="text-xs text-muted-foreground mt-1">
						projekt igång
					</p>
				</div>
			</div>

			{/* Total Hours This Week */}
			<div className="rounded-xl border bg-card p-6">
				<div className="flex items-center justify-between space-y-0 pb-2">
					<h3 className="text-sm font-medium text-muted-foreground">
						Timmar denna vecka
					</h3>
					<svg 
						className="h-4 w-4 text-muted-foreground" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div className="mt-2">
					<p className="text-3xl font-bold">{stats.total_hours_week.toFixed(1)}h</p>
					<p className="text-xs text-muted-foreground mt-1">
						arbetade timmar
					</p>
				</div>
			</div>

			{/* Total Materials */}
			<div className="rounded-xl border bg-card p-6">
				<div className="flex items-center justify-between space-y-0 pb-2">
					<h3 className="text-sm font-medium text-muted-foreground">
						Material denna vecka
					</h3>
					<svg 
						className="h-4 w-4 text-muted-foreground" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
				</div>
				<div className="mt-2">
					<p className="text-3xl font-bold">{stats.total_materials_week}</p>
					<p className="text-xs text-muted-foreground mt-1">
						materialposter
					</p>
				</div>
			</div>

			{/* Total Time Entries */}
			<div className="rounded-xl border bg-card p-6">
				<div className="flex items-center justify-between space-y-0 pb-2">
					<h3 className="text-sm font-medium text-muted-foreground">
						Tidrapporter denna vecka
					</h3>
					<svg 
						className="h-4 w-4 text-muted-foreground" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<div className="mt-2">
					<p className="text-3xl font-bold">{stats.total_time_entries_week}</p>
					<p className="text-xs text-muted-foreground mt-1">
						tidrapporter
					</p>
				</div>
			</div>
		</div>
	);
}

