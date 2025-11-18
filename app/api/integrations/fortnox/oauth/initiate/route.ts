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
		// Priority: FORTNOX_REDIRECT_URI > NEXT_PUBLIC_SITE_URL > NEXT_PUBLIC_APP_URL > request host
		let redirectUri: string;
		
		if (process.env.FORTNOX_REDIRECT_URI) {
			// Use explicit Fortnox redirect URI if set
			redirectUri = process.env.FORTNOX_REDIRECT_URI;
		} else {
			const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
			const requestUrl = new URL(request.url);
			const fallbackBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
			
			redirectUri = `${baseUrl || fallbackBaseUrl}/api/integrations/fortnox/oauth/callback`;
		}
		
		// Log redirect URI for debugging
		console.log('[Fortnox OAuth] Redirect URI:', redirectUri);
		console.log('[Fortnox OAuth] Environment check:', {
			FORTNOX_REDIRECT_URI: process.env.FORTNOX_REDIRECT_URI ? 'set' : 'not set',
			NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
			NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
			requestHost: new URL(request.url).host,
		});
		
		const state = Buffer.from(JSON.stringify({ orgId: membership.org_id, userId: user.id })).toString('base64url');
		
		const authUrl = new URL('https://apps.fortnox.se/oauth-v1/auth');
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectUri);
		// Fortnox OAuth scopes - must match exactly what's configured in Fortnox Developer Portal
		// IMPORTANT: Only request scopes that are enabled AND licensed in your Fortnox account
		// Common valid scopes: invoice, customer, companyinformation, article, etc.
		// If you get "error_missing_license", your Fortnox account doesn't have the required license for those scopes
		// OAuth scopes - must match exactly what's configured in Fortnox Developer Portal
		// IMPORTANT: Check your Fortnox Developer Portal for valid scope names
		// Default: 'invoice customer' (works for most use cases)
		// If you want to fetch company information automatically, you can try adding 'companyinformation'
		// Note: Having "Företagsinformation" permission in Developer Portal might not require explicit scope
		// Test with just 'invoice customer' first - /companyinformation endpoint might work without it
		// If you get 'invalid_scope', remove 'companyinformation' from scopes
		const requestedScopes = process.env.FORTNOX_OAUTH_SCOPES || 'invoice customer';
		
		console.log('[Fortnox OAuth] Requested scopes:', requestedScopes);
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


