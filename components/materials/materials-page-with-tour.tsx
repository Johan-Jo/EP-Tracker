'use client';

import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface MaterialsPageWithTourProps {
	children: React.ReactNode;
}

export function MaterialsPageWithTour({ children }: MaterialsPageWithTourProps) {
	return (
		<>
			<PageTourTrigger tourId="materials" />
			{children}
		</>
	);
}

