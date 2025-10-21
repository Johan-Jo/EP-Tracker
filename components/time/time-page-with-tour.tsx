'use client';

import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface TimePageWithTourProps {
	children: React.ReactNode;
}

export function TimePageWithTour({ children }: TimePageWithTourProps) {
	return (
		<>
			<PageTourTrigger tourId="time" />
			{children}
		</>
	);
}

