import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/demo/toggle-example-mode
 * 
 * Toggle example mode for logged-in users.
 * Sets a cookie that getSession() will read to swap org_id.
 */
export async function POST(request: NextRequest) {
	try {
		const { enabled } = await request.json();

		const cookieStore = await cookies();
		
		if (enabled) {
			cookieStore.set('exampleModeEnabled', 'true', {
				path: '/',
				maxAge: 60 * 60 * 24 * 365, // 1 year
				httpOnly: false, // Allow client-side access
				sameSite: 'lax',
			});
		} else {
			cookieStore.delete('exampleModeEnabled');
		}

		return NextResponse.json({ success: true, enabled });
	} catch (error) {
		console.error('[DEMO] Error toggling example mode:', error);
		return NextResponse.json(
			{ error: 'Failed to toggle example mode' },
			{ status: 500 }
		);
	}
}

