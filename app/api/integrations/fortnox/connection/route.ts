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

/**
 * PATCH /api/integrations/fortnox/connection
 * Update Fortnox connection (currently only fortnox_customer_number)
 * 
 * Query params:
 * - orgId: Organization ID (required)
 * 
 * Body:
 * - fortnox_customer_number: Fortnox customer number (optional, can be null)
 */
export async function PATCH(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can update connection
		if (!['admin', 'finance'].includes(membership.role)) {
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

		const body = await request.json();
		const { fortnox_customer_number } = body;

		// Validate that fortnox_customer_number is either a string or null
		if (fortnox_customer_number !== undefined && fortnox_customer_number !== null && typeof fortnox_customer_number !== 'string') {
			return NextResponse.json(
				{ error: 'fortnox_customer_number must be a string or null' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Check if connection exists
		const { data: existingConnection, error: fetchError } = await supabase
			.from('fortnox_connections')
			.select('id')
			.eq('org_id', orgId)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				return NextResponse.json(
					{ error: 'Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.' },
					{ status: 404 }
				);
			}
			console.error('Supabase error:', fetchError);
			return NextResponse.json(
				{ error: 'Failed to fetch connection', details: fetchError.message },
				{ status: 500 }
			);
		}

		// Update only fortnox_customer_number
		const updateData: { fortnox_customer_number?: string | null } = {};
		if (fortnox_customer_number !== undefined) {
			updateData.fortnox_customer_number = fortnox_customer_number === '' ? null : fortnox_customer_number;
		}

		const { data: updatedConnection, error: updateError } = await supabase
			.from('fortnox_connections')
			.update(updateData)
			.eq('id', existingConnection.id)
			.select()
			.single();

		if (updateError) {
			console.error('Failed to update connection:', updateError);
			return NextResponse.json(
				{ error: 'Failed to update connection', details: updateError.message },
				{ status: 500 }
			);
		}

		// Don't return sensitive tokens in response
		const { access_token, refresh_token, ...safeConnection } = updatedConnection;

		return NextResponse.json({ connection: safeConnection });
	} catch (error) {
		console.error('Error updating Fortnox connection:', error);
		return NextResponse.json(
			{ error: 'An unexpected error occurred' },
			{ status: 500 }
		);
	}
}
