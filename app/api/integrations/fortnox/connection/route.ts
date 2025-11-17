import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/connection
 * Get Fortnox connection status for an organization
 * 
 * Query params:
 * - orgId: Organization ID (required)
 * 
 * Returns: Connection object or 404 if not found
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Admin, finance, and foreman can view connection status
		if (!['admin', 'finance', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const orgId = searchParams.get('orgId');

		if (!orgId) {
			return NextResponse.json(
				{ error: 'orgId parameter is required' },
				{ status: 400 }
			);
		}

		// Verify user belongs to this org
		if (membership.org_id !== orgId) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const supabase = await createClient();

		const { data: connection, error } = await supabase
			.from('fortnox_connections')
			.select('*')
			.eq('org_id', orgId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				// No rows returned - return 200 with null connection (not 404)
				return NextResponse.json({ connection: null }, { status: 200 });
			}
			console.error('Supabase error:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch connection', details: error.message },
				{ status: 500 }
			);
		}

		// Don't return sensitive tokens in response
		const { access_token, refresh_token, ...safeConnection } = connection;

		return NextResponse.json({ connection: safeConnection });
	} catch (error) {
		console.error('Error fetching Fortnox connection:', error);
		return NextResponse.json(
			{ error: 'An unexpected error occurred' },
			{ status: 500 }
		);
	}
}


