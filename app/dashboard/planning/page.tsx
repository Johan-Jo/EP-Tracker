import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { Suspense } from 'react';
import { PlanningPageWrapper } from './planning-page-wrapper';

export default async function PlanningPage() {
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Use cached session
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode
	if (!inDemoMode && !user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/complete-setup');
	}

	// Check permissions: admin/foreman only
	const userRole = membership.role as string;
	if (!['admin', 'foreman', 'finance'].includes(userRole)) {
		redirect('/dashboard');
	}

	return (
		<Suspense fallback={
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p className="text-gray-600">Laddar planering...</p>
				</div>
			</div>
		}>
			<PlanningPageWrapper />
		</Suspense>
	);
}

