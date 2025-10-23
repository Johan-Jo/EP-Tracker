'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FeatureTour } from './feature-tour';
import { 
	dashboardTourSteps, 
	projectsTourSteps, 
	timeTourSteps, 
	materialsTourSteps, 
	approvalsTourSteps,
	planningTourSteps,
	planningTodayTourSteps
} from '@/lib/onboarding/tour-steps';

const tourMap = {
	'dashboard': dashboardTourSteps,
	'projects': projectsTourSteps,
	'time': timeTourSteps,
	'materials': materialsTourSteps,
	'approvals': approvalsTourSteps,
	'planning': planningTourSteps,
	'planning-today': planningTodayTourSteps,
};

interface PageTourTriggerProps {
	tourId: keyof typeof tourMap;
}

export function PageTourTrigger({ tourId }: PageTourTriggerProps) {
	const searchParams = useSearchParams();
	const [shouldShowTour, setShouldShowTour] = useState(false);

	useEffect(() => {
		// Check if tour parameter matches this page's tour
		const tourParam = searchParams.get('tour');
		if (tourParam === tourId) {
			// Small delay to ensure page is rendered
			setTimeout(() => setShouldShowTour(true), 500);
		}
	}, [searchParams, tourId]);

	if (!shouldShowTour) {
		return null;
	}

	const steps = tourMap[tourId];

	return (
		<FeatureTour
			tourId={tourId}
			steps={steps}
			autoStart={true}
		/>
	);
}

