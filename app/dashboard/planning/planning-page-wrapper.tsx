'use client';

import dynamic from 'next/dynamic';

// Lazy load PlanningPageClient (includes heavy @dnd-kit library ~200KB)
// This wrapper is a Client Component, allowing us to use ssr: false
const PlanningPageClient = dynamic(
	() => import('@/components/planning/planning-page-client').then((mod) => ({ default: mod.PlanningPageClient })),
	{
		loading: () => (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p className="text-gray-600">Laddar planering...</p>
				</div>
			</div>
		),
		ssr: false, // DnD doesn't work with SSR
	}
);

export function PlanningPageWrapper() {
	return <PlanningPageClient />;
}

