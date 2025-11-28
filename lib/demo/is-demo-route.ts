/**
 * Check if current request is in demo mode
 * Uses the isDemoRoute cookie set by middleware
 */

import { cookies } from 'next/headers';

export async function isDemoRoute(): Promise<boolean> {
	try {
		const cookieStore = await cookies();
		return cookieStore.get('isDemoRoute')?.value === 'true';
	} catch {
		return false;
	}
}

