'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FeatureTour } from './feature-tour';
import { 
	dashboardTourSteps, 
	projectsTourSteps, 
	timeTourSteps, 
	materialsTourSteps, 
	approvalsTourSteps,
	planningTourSteps,
	planningTodayTourSteps,
	notificationsTourSteps
} from '@/lib/onboarding/tour-steps';

const tourMap = {
	'dashboard': dashboardTourSteps,
	'projects': projectsTourSteps,
	'time': timeTourSteps,
	'materials': materialsTourSteps,
	'approvals': approvalsTourSteps,
	'planning': planningTourSteps,
	'planning-today': planningTodayTourSteps,
	'notifications': notificationsTourSteps,
};

interface PageTourTriggerProps {
	tourId: keyof typeof tourMap;
}

function PageTourTriggerInner({ tourId }: PageTourTriggerProps) {
	const searchParams = useSearchParams();
	const [shouldShowTour, setShouldShowTour] = useState(false);

	useEffect(() => {
		// Check if tour parameter matches this page's tour
		const tourParam = searchParams.get('tour');
		console.log('[PageTourTrigger] Tour param:', tourParam, 'Expected:', tourId);
		if (tourParam === tourId) {
			console.log('[PageTourTrigger] Match! Starting tour in 500ms...');
			// Small delay to ensure page is rendered
			setTimeout(() => {
				console.log('[PageTourTrigger] Setting shouldShowTour to true');
				setShouldShowTour(true);
			}, 500);
		}
	}, [searchParams, tourId]);

	if (!shouldShowTour) {
		return null;
	}

	const steps = tourMap[tourId];
	console.log('[PageTourTrigger] Rendering FeatureTour with', steps.length, 'steps');

	return (
		<FeatureTour
			tourId={tourId}
			steps={steps}
			autoStart={true}
		/>
	);
}

export function PageTourTrigger(props: PageTourTriggerProps) {
	return (
		<Suspense fallback={null}>
			<PageTourTriggerInner {...props} />
		</Suspense>
	);
}

