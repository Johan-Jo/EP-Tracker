import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { getFortnoxConnectionForOrg } from '@/lib/integrations/fortnox/client';

/**
 * GET /api/integrations/fortnox/check-connection
 * Check if organization has an active Fortnox connection
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const connection = await getFortnoxConnectionForOrg(membership.org_id);

		return NextResponse.json({
			hasConnection: !!connection,
		});
	} catch (error) {
		console.error('[Fortnox Check Connection] Error:', error);
		return NextResponse.json(
			{ hasConnection: false, error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

