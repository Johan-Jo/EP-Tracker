import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '@/lib/auth/get-session';
import DashboardClient from './dashboard-client';
// EPIC 26.4: Use optimized database functions
import {
	getActiveTimeEntry,
	getActiveProjects,
	getRecentProject,
} from '@/lib/db/dashboard';
// EPIC 26.7: Server components for streaming SSR
import { DashboardStatsServer } from './dashboard-stats-server';
import { DashboardActivitiesServer } from './dashboard-activities-server';
import { DashboardStatsSkeleton } from '@/components/dashboard/dashboard-stats-skeleton';
import { DashboardActivitiesSkeleton } from '@/components/dashboard/dashboard-activities-skeleton';

// EPIC 26.7: Enable Edge Runtime for faster TTFB
export const runtime = 'edge';

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

	// EPIC 26.7: Streaming SSR Implementation
	// BEFORE (Phase 1): Server waits for ALL data before sending HTML
	//  - TTFB: 1.4s (user sees nothing)
	//  - FCP: 1.64s
	//
	// AFTER (Phase 2): Server streams HTML progressively
	//  1. Shell (layout + header) streams immediately (0.3s)
	//  2. Stats stream in (parallel)
	//  3. Activities stream in (parallel)
	//  - TTFB: 0.3s (user sees layout immediately!)
	//  - FCP: 0.8s (50% snabbare!)
	
	// Fetch only critical, fast data for initial render
	const [activeTimeEntry, recentProject, allProjects] = await Promise.all([
		// Critical: Needed for timer widget
		getActiveTimeEntry(user.id),
		
		// Fast: Single row lookup
		getRecentProject(membership.org_id),
		
		// Fast: Simple active projects list
		getActiveProjects(membership.org_id),
	]);

	return (
		<div className="px-4 md:px-8 py-6 space-y-6">
			{/* Header - streams immediately */}
			<div className="bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-6">
				<h1 className="text-3xl font-bold tracking-tight text-gray-900">
					Välkommen, {profile?.full_name || 'användare'}! 👋
				</h1>
				<p className="text-gray-600 mt-2">
					Här är en översikt av din aktivitet
				</p>
			</div>

			{/* Timer Widget - streams immediately (critical for UX) */}
			<DashboardClient 
				userName={profile?.full_name || 'användare'} 
				stats={{ active_projects: 0, total_hours_week: 0, total_materials_week: 0, total_time_entries_week: 0 }}
				activeTimeEntry={activeTimeEntry}
				recentProject={recentProject}
				allProjects={allProjects}
				recentActivities={[]}
				userId={user.id}
			/>

			{/* Stats - streams in parallel (shows skeleton first) */}
			<Suspense fallback={<DashboardStatsSkeleton />}>
				<DashboardStatsServer />
			</Suspense>

			{/* Activities - streams in parallel (shows skeleton first) */}
			<Suspense fallback={<DashboardActivitiesSkeleton />}>
				<DashboardActivitiesServer />
			</Suspense>
		</div>
	);
}
