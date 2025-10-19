import { createClient } from '@/lib/supabase/server';

/**
 * Get user session and membership
 * NO CACHING - Fresh data on every call for development
 * 
 * Note: This will be called by layout AND pages, resulting in duplicate queries.
 * This is intentional during development to avoid any caching issues.
 * For production, consider re-enabling React cache() or using props to pass data down.
 */
export async function getSession() {
	const supabase = await createClient();
	
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { user: null, membership: null, profile: null };
	}

	// Fetch profile and membership in parallel (only optimization we keep)
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
}

/**
 * Type for the session return value
 */
export type Session = Awaited<ReturnType<typeof getSession>>;

