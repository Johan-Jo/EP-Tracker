/**
 * Get Demo Organization ID
 * 
 * Helper function to get the demo organization ID by slug.
 * Caches the result to avoid repeated queries.
 */

import { createClient } from '@/lib/supabase/server';

let cachedDemoOrgId: string | null = null;

/**
 * Get the demo organization ID
 * @returns Demo organization ID or null if not found
 */
export async function getDemoOrgId(): Promise<string | null> {
	// Return cached value if available
	if (cachedDemoOrgId) {
		return cachedDemoOrgId;
	}

	const supabase = await createClient();
	
	const { data, error } = await supabase
		.from('organizations')
		.select('id')
		.eq('slug', 'demo')
		.single();

	if (error) {
		console.error('[DEMO] Failed to get demo org:', {
			code: error.code,
			message: error.message,
			details: error.details,
			hint: error.hint,
		});
		return null;
	}

	if (!data) {
		console.error('[DEMO] Demo organization not found (no data returned)');
		return null;
	}

	cachedDemoOrgId = data.id;
	return data.id;
}

/**
 * Clear the cached demo org ID (useful for testing or after seeding)
 */
export function clearDemoOrgCache(): void {
	cachedDemoOrgId = null;
}

