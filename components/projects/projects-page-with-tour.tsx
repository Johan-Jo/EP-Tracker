'use client';

import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface ProjectsPageWithTourProps {
	children: React.ReactNode;
}

export function ProjectsPageWithTour({ children }: ProjectsPageWithTourProps) {
	return (
		<>
			<PageTourTrigger tourId="projects" />
			{children}
		</>
	);
}

