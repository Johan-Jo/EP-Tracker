import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Cached function to get user session and membership
 * This prevents duplicate database calls within the same request
 * Uses React's cache() to deduplicate calls during SSR
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

	// Fetch profile and membership in parallel
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

