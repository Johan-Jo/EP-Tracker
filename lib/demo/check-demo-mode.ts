/**
 * Check Demo Mode in API Routes
 * 
 * Helper function to check if a request is in demo mode.
 * Used in API routes to block writes.
 */

import { cookies } from 'next/headers';
import { getDemoOrgId } from './get-demo-org';

export interface DemoModeCheck {
	isDemoMode: boolean;
	demoOrgId: string | null;
	effectiveOrgId: string | null;
}

/**
 * Check if the current request is in demo mode
 * @param userOrgId The user's real organization ID
 * @returns Demo mode check result
 */
export async function checkDemoMode(userOrgId: string | null): Promise<DemoModeCheck> {
	const cookieStore = await cookies();
	const exampleModeEnabled = cookieStore.get('exampleModeEnabled')?.value === 'true';
	
	// Check if user is accessing demo org
	const demoOrgId = await getDemoOrgId();
	const isDemoOrg = !!(demoOrgId && userOrgId === demoOrgId);
	
	// Demo mode is active if:
	// 1. User is in example mode (viewing demo org), OR
	// 2. User's org is the demo org (anonymous demo access)
	const isDemoMode = exampleModeEnabled || isDemoOrg;

	return {
		isDemoMode,
		demoOrgId,
		effectiveOrgId: isDemoMode && demoOrgId ? demoOrgId : userOrgId,
	};
}

