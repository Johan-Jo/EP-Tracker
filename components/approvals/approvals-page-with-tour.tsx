'use client';

import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

interface ApprovalsPageWithTourProps {
	children: React.ReactNode;
}

export function ApprovalsPageWithTour({ children }: ApprovalsPageWithTourProps) {
	return (
		<>
			<PageTourTrigger tourId="approvals" />
			{children}
		</>
	);
}

