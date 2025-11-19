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
		// 
		// Common valid scopes:
		// - 'invoice' - For creating/reading invoices
		// - 'customer' - For reading customers
		// - 'salary' - For reading/writing employees and salary transactions (REQUIRED for employee import)
		//   This scope grants access to:
		//   - GET /3/employees - List employees
		//   - GET /3/employees/{EmployeeId} - Get specific employee
		//   - POST /3/salarytransactions - Create salary transactions
		//   - POST /3/attendancetransactions - Create attendance transactions
		// - 'companyinformation' - For reading company information
		// 
		// To enable employee import, you MUST include 'salary' scope:
		// Set FORTNOX_OAUTH_SCOPES='invoice customer salary' in your .env file
		// 
		// TODO: IMPORTANT - OAuth tokens are issued with the scopes requested at authorization time.
		// If you add new rights/licenses to your Fortnox account AFTER the initial OAuth flow,
		// you MUST re-authorize (clear the connection and go through OAuth again) to get a new
		// token with the updated scopes. Old tokens will NOT automatically gain access to new scopes.
		// 
		// If you get "error_missing_license", your Fortnox account doesn't have the required license for those scopes
		// If you get "Har inte behörighet för scope", you need to reconnect Fortnox with the correct scopes
		// If you get 403 "Behörighet saknas" for employees, check:
		//   1) The 'salary' scope is included in FORTNOX_OAUTH_SCOPES
		//   2) The token was issued AFTER the salary scope was granted
		//   3) Your Fortnox account has an active Payroll (Lön) license
		//   4) The user who authorized has permissions to read employees in Fortnox
		const requestedScopes = process.env.FORTNOX_OAUTH_SCOPES || 'invoice customer salary';
		
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


