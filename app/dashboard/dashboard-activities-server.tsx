/**
 * EPIC 26.7: Server Component for Recent Activities
 * Fetches activities data asynchronously for Streaming SSR
 */
import { getRecentActivities } from '@/lib/db/dashboard';
import { getSession } from '@/lib/auth/get-session';
import type { DashboardActivity } from '@/lib/db/dashboard';

export async function DashboardActivitiesServer() {
	const { membership } = await getSession();
	
	if (!membership) {
		return null;
	}

	const activities = await getRecentActivities(membership.org_id, 15);

	if (!activities || activities.length === 0) {
		return (
			<div className="rounded-xl border bg-card p-6">
				<h2 className="text-lg font-semibold mb-4">Senaste aktivitet</h2>
				<p className="text-sm text-muted-foreground">Ingen aktivitet än.</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border bg-card">
			<div className="border-b p-6">
				<h2 className="text-lg font-semibold">Senaste aktivitet</h2>
			</div>
			<div className="p-6">
				<div className="space-y-4">
					{activities.map((activity: DashboardActivity, index: number) => (
						<div key={index} className="flex items-start gap-4">
							<div className="rounded-full bg-orange-100 p-2 flex-shrink-0">
								{activity.type === 'time_entry' && (
									<svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								)}
								{activity.type === 'material' && (
									<svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
									</svg>
								)}
								{activity.type === 'expense' && (
									<svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								)}
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">{activity.description}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{new Date(activity.created_at).toLocaleDateString('sv-SE', {
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

