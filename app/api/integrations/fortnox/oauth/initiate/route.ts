import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/oauth/initiate
 * Initiates Fortnox OAuth flow
 * Only admin and finance can connect Fortnox accounts
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can connect Fortnox
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const clientId = process.env.FORTNOX_CLIENT_ID;
		if (!clientId) {
			return NextResponse.json(
				{ error: 'Fortnox integration is not configured. Please contact support.' },
				{ status: 500 }
			);
		}

		// Build OAuth authorization URL
		// Get base URL from environment or request
		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
		const requestUrl = new URL(request.url);
		const fallbackBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
		
		const redirectUri = `${baseUrl || fallbackBaseUrl}/api/integrations/fortnox/oauth/callback`;
		
		// Log redirect URI for debugging (remove in production)
		console.log('[Fortnox OAuth] Redirect URI:', redirectUri);
		
		const state = Buffer.from(JSON.stringify({ orgId: membership.org_id, userId: user.id })).toString('base64url');
		
		const authUrl = new URL('https://apps.fortnox.se/oauth-v1/auth');
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectUri);
		// Fortnox OAuth scopes - must match exactly what's configured in Fortnox Developer Portal
		// IMPORTANT: Only request scopes that are enabled AND licensed in your Fortnox account
		// Common valid scopes: invoice, customer, companyinformation, article, etc.
		// If you get "error_missing_license", your Fortnox account doesn't have the required license for those scopes
		const requestedScopes = process.env.FORTNOX_OAUTH_SCOPES || 'invoice customer';
		authUrl.searchParams.set('scope', requestedScopes);
		authUrl.searchParams.set('state', state);
		authUrl.searchParams.set('access_type', 'offline');
		authUrl.searchParams.set('response_type', 'code');

		return NextResponse.json({ authUrl: authUrl.toString() });
	} catch (error) {
		console.error('Error initiating Fortnox OAuth:', error);
		return NextResponse.json(
			{ error: 'Failed to initiate OAuth flow' },
			{ status: 500 }
		);
	}
}


