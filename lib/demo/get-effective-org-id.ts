/**
 * Get Effective Organization ID
 * 
 * Returns the organization ID that should be used for queries based on demo mode.
 * - In anonymous demo mode: returns demo org ID
 * - In example mode: returns demo org ID
 * - In normal mode: returns user's real org ID
 */

import { getDemoOrgId } from './get-demo-org';

export async function getEffectiveOrgId(
	userOrgId: string | null,
	demoMode: 'anonymous' | 'exampleOrg' | 'none'
): Promise<string | null> {
	if (demoMode === 'none') {
		return userOrgId;
	}

	// In demo or example mode, use demo org ID
	const demoOrgId = await getDemoOrgId();
	return demoOrgId;
}

