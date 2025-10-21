/**
 * Global Search
 * 
 * Search across users and organizations for support purposes.
 */

import { createClient } from '@/lib/supabase/server';

export interface SearchResult {
	type: 'user' | 'organization';
	id: string;
	title: string;
	subtitle: string;
	metadata?: any;
}

/**
 * Search across users and organizations
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
	if (!query || query.trim().length < 2) {
		return [];
	}

	// Security: Validate and sanitize search query
	if (query.length > 100) {
		throw new Error('Search query too long (max 100 characters)');
	}

	const supabase = await createClient();
	
	// Sanitize query: escape SQL wildcards and special characters
	const sanitized = query
		.replace(/[%_\\]/g, '\\$&') // Escape SQL wildcards
		.toLowerCase()
		.trim();
	
	const searchTerm = `%${sanitized}%`;
	const results: SearchResult[] = [];

	try {
		// Search users
		const { data: users } = await supabase
			.from('profiles')
			.select(`
				id,
				email,
				full_name,
				organization_members!inner(
					organizations(
						id,
						name
					)
				)
			`)
			.or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
			.limit(10);

		if (users) {
			for (const user of users) {
				const orgMember: any = user.organization_members?.[0];
				const org = orgMember?.organizations;

				results.push({
					type: 'user',
					id: user.id,
					title: user.full_name || user.email,
					subtitle: org ? `${user.email} · ${org.name}` : user.email,
					metadata: {
						email: user.email,
						org_id: org?.id,
						org_name: org?.name,
					},
				});
			}
		}

		// Search organizations
		const { data: orgs } = await supabase
			.from('organizations')
			.select('id, name, status')
			.ilike('name', searchTerm)
			.limit(10);

		if (orgs) {
			for (const org of orgs) {
				results.push({
					type: 'organization',
					id: org.id,
					title: org.name,
					subtitle: `Organization · ${org.status}`,
					metadata: {
						status: org.status,
					},
				});
			}
		}

		return results;
	} catch (error) {
		console.error('Error in global search:', error);
		return [];
	}
}

