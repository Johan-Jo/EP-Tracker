import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * DELETE /api/integrations/fortnox/oauth/disconnect
 * Disconnects Fortnox connection for the organization
 * Only admin and finance can disconnect
 */
export async function DELETE(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can disconnect
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const supabase = await createClient();

		// Delete Fortnox connection
		const { error } = await supabase
			.from('fortnox_connections')
			.delete()
			.eq('org_id', membership.org_id);

		if (error) {
			console.error('Failed to disconnect Fortnox:', error);
			return NextResponse.json(
				{ error: 'Failed to disconnect Fortnox account' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error disconnecting Fortnox:', error);
		return NextResponse.json(
			{ error: 'An unexpected error occurred' },
			{ status: 500 }
		);
	}
}



