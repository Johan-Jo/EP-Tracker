'use client';

import { useState, useEffect } from 'react';
import { WelcomeModal } from '@/components/onboarding/welcome-modal';
import { QuickStartChecklist } from '@/components/onboarding/quick-start-checklist';
import { FeatureTour } from '@/components/onboarding/feature-tour';
import { dashboardTourSteps } from '@/lib/onboarding/tour-steps';

interface DashboardWithOnboardingProps {
	userName?: string;
	organizationName?: string;
	userRole?: string;
	children: React.ReactNode;
}

export function DashboardWithOnboarding({
	userName,
	organizationName,
	userRole,
	children,
}: DashboardWithOnboardingProps) {
	const [showWelcome, setShowWelcome] = useState(false);
	const [showChecklist, setShowChecklist] = useState(true);
	const [showTour, setShowTour] = useState(false);

	useEffect(() => {
		// Check if user has completed onboarding
		const completed = localStorage.getItem('onboarding-completed');
		
		// Show welcome modal if not completed (wait 500ms for smooth render)
		if (!completed) {
			setTimeout(() => setShowWelcome(true), 500);
		}

		// Show checklist if not dismissed and not all complete
		const dismissed = localStorage.getItem('quick-start-dismissed');
		if (dismissed === 'true') {
			setShowChecklist(false);
		}
	}, []);

	function handleWelcomeComplete() {
		setShowWelcome(false);
		// Start feature tour after welcome modal
		setTimeout(() => setShowTour(true), 500);
	}

	return (
		<>
			<WelcomeModal
				open={showWelcome}
				onComplete={handleWelcomeComplete}
				userName={userName}
				organizationName={organizationName}
			/>

			{showTour && (
				<FeatureTour
					tourId="dashboard"
					steps={dashboardTourSteps}
					autoStart={true}
				/>
			)}

			<div className="space-y-8">
				{/* Show checklist for admins and foremans */}
				{showChecklist && (userRole === 'admin' || userRole === 'foreman') && (
					<QuickStartChecklist />
				)}

				{children}
			</div>
		</>
	);
}

