'use client';

import { useState } from 'react';
import { InvoiceOnboarding } from './invoice-onboarding';
import { InvoiceBasisPage } from './invoice-basis-page-new';

interface InvoiceBasisPageClientProps {
	orgId: string;
	projects: Array<{ id: string; name: string; projectNumber: string | null }>;
	userRole: string;
	onboardingCompleted: boolean;
	hasFortnoxConnection?: boolean;
	hasInvoiceScope?: boolean;
}

/**
 * Client component wrapper that handles onboarding state
 * and conditionally shows onboarding or the main invoice basis page.
 */
export function InvoiceBasisPageClient({
	orgId,
	projects,
	userRole,
	onboardingCompleted: initialOnboardingCompleted,
	hasFortnoxConnection = false,
	hasInvoiceScope = false,
}: InvoiceBasisPageClientProps) {
	const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted);

	if (!onboardingCompleted) {
		return (
			<InvoiceOnboarding
				orgId={orgId}
				onComplete={() => setOnboardingCompleted(true)}
			/>
		);
	}

	return (
		<InvoiceBasisPage
			orgId={orgId}
			projects={projects}
			userRole={userRole as 'admin' | 'foreman' | 'finance'}
			hasFortnoxConnection={hasFortnoxConnection}
			hasInvoiceScope={hasInvoiceScope}
		/>
	);
}

