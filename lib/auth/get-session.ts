import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

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
 */
export const getSession = cache(async () => {
	const supabase = await createClient();
	
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

	return {
		user,
		profile: profileResult.data,
		membership: membershipResult.data,
	};
});

/**
 * Type for the session return value
 */
export type Session = Awaited<ReturnType<typeof getSession>>;

