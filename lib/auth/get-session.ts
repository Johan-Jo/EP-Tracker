import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';
import { cookies } from 'next/headers';

/**
 * Get user session and membership with React Cache
 * 
 * PERFORMANCE OPTIMIZATION (Story 26.2):
 * - Uses React cache() to deduplicate requests within a single render
 * - Prevents duplicate queries when called from both layout and page
 * - Data is fresh for each request but cached during the request lifecycle
 * 
 * Expected improvement: 50% fewer session queries (no more layout + page duplication)
 * 
 * How it works:
 * - First call fetches from database
 * - Subsequent calls in same request return cached result
 * - Cache automatically clears between requests
 * 
 * DEMO MODE SUPPORT:
 * - Checks for example mode in localStorage (via cookie)
 * - If example mode is enabled, returns membership with demo org ID
 */
export const getSession = cache(async () => {
	const supabase = await createClient();
	
	// Check if we're in demo mode (via cookie set by middleware)
	const cookieStore = await cookies();
	const isDemoRoute = cookieStore.get('isDemoRoute')?.value === 'true';
	
	// If in demo route, return fake session with demo org membership
	if (isDemoRoute) {
		try {
			const demoOrgId = await getDemoOrgId();
			if (demoOrgId) {
				return {
					user: { id: 'demo-user-id', email: 'demo@example.com' } as any,
					profile: { id: 'demo-user-id', email: 'demo@example.com', full_name: 'Demo Användare' } as any,
					membership: { org_id: demoOrgId, role: 'admin', hourly_rate_sek: 0 } as any,
				};
			}
			// If demo org not found, still return a session but log error
			// Use a placeholder org ID to prevent crashes
			console.error('[getSession] Demo mode enabled but demo org not found - using placeholder');
			return {
				user: { id: 'demo-user-id', email: 'demo@example.com' } as any,
				profile: { id: 'demo-user-id', email: 'demo@example.com', full_name: 'Demo Användare' } as any,
				membership: { org_id: '00000000-0000-0000-0000-000000000000', role: 'admin', hourly_rate_sek: 0 } as any,
			};
		} catch (error) {
			console.error('[getSession] Error getting demo org:', error);
			// Return placeholder session to prevent crashes
			return {
				user: { id: 'demo-user-id', email: 'demo@example.com' } as any,
				profile: { id: 'demo-user-id', email: 'demo@example.com', full_name: 'Demo Användare' } as any,
				membership: { org_id: '00000000-0000-0000-0000-000000000000', role: 'admin', hourly_rate_sek: 0 } as any,
			};
		}
	}
	
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { user: null, membership: null, profile: null };
	}

	// Fetch profile and membership in parallel for optimal performance
	const [profileResult, membershipResult] = await Promise.all([
		supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single(),
		supabase
			.from('memberships')
			.select('org_id, role, hourly_rate_sek')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single(),
	]);

	let membership = membershipResult.data;

	// Check if example mode is enabled (for logged-in users viewing demo org)
	if (membership) {
		// Server-side: check cookie
		try {
			const cookieStore = await cookies();
			const exampleModeEnabled = cookieStore.get('exampleModeEnabled')?.value === 'true';
			
			if (exampleModeEnabled) {
				const demoOrgId = await getDemoOrgId();
				if (demoOrgId) {
					// Return membership with demo org ID but keep user's role
					membership = {
						...membership,
						org_id: demoOrgId,
					};
				}
			}
		} catch (error) {
			// cookies() might fail in some contexts, ignore
			console.warn('[getSession] Could not check example mode:', error);
		}
	}

	return {
		user,
		profile: profileResult.data,
		membership,
	};
});

/**
 * Type for the session return value
 */
export type Session = Awaited<ReturnType<typeof getSession>>;

