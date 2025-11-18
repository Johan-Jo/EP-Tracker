import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/oauth/callback
 * Handles Fortnox OAuth callback and stores connection
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get('code');
		const state = searchParams.get('state');
		const error = searchParams.get('error');
		const errorDescription = searchParams.get('error_description');

		// Check for OAuth errors
		if (error) {
			console.error('Fortnox OAuth error:', error, errorDescription);
			return NextResponse.redirect(
				new URL(
					`/dashboard/settings/fortnox?fortnox_error=${encodeURIComponent(errorDescription || error)}`,
					request.url
				)
			);
		}

		if (!code || !state) {
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=missing_code_or_state',
					request.url
				)
			);
		}

		// Decode state to get orgId
		let stateData: { orgId: string; userId: string };
		try {
			stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
		} catch {
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=invalid_state',
					request.url
				)
			);
		}

		// Verify user has permission
		const { user, membership } = await getSession();
		if (!user || !membership || membership.org_id !== stateData.orgId) {
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=unauthorized',
					request.url
				)
			);
		}

		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=forbidden',
					request.url
				)
			);
		}

		// Exchange authorization code for tokens
		const clientId = process.env.FORTNOX_CLIENT_ID;
		const clientSecret = process.env.FORTNOX_CLIENT_SECRET;
		
		// Get base URL from environment or request (must match initiate route)
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
		console.log('[Fortnox OAuth Callback] Redirect URI:', redirectUri);

		if (!clientId || !clientSecret) {
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=configuration_error',
					request.url
				)
			);
		}

		// Fortnox OAuth token endpoint
		// Fortnox uses apps.fortnox.se for OAuth, not api.fortnox.se
		const tokenUrl = 'https://apps.fortnox.se/oauth-v1/token';
		const params = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
		});
		
		console.log('[Fortnox OAuth] Token exchange request:', {
			tokenUrl,
			redirectUri,
			hasCode: !!code,
			hasClientId: !!clientId,
			hasClientSecret: !!clientSecret,
		});

		const tokenResponse = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			let errorMessage = 'token_exchange_failed';
			
			// Try to parse error response
			try {
				const errorJson = JSON.parse(errorText);
				errorMessage = errorJson.error_description || errorJson.error || errorMessage;
				console.error('[Fortnox OAuth] Token exchange error:', {
					status: tokenResponse.status,
					statusText: tokenResponse.statusText,
					error: errorJson,
					redirectUri,
				});
			} catch {
				console.error('[Fortnox OAuth] Token exchange error (non-JSON):', {
					status: tokenResponse.status,
					statusText: tokenResponse.statusText,
					errorText,
					redirectUri,
				});
				errorMessage = errorText || errorMessage;
			}
			
			return NextResponse.redirect(
				new URL(
					`/dashboard/settings/fortnox?fortnox_error=${encodeURIComponent(errorMessage)}`,
					request.url
				)
			);
		}

		const tokenData = await tokenResponse.json();

		// Calculate expiration time (Fortnox tokens typically expire in 3600 seconds)
		const expiresIn = tokenData.expires_in || 3600;
		const expiresAt = new Date(Date.now() + expiresIn * 1000);

		// Create temporary connection object to fetch company information
		const tempConnection = {
			id: 'temp',
			org_id: stateData.orgId,
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			access_token_expires_at: expiresAt.toISOString(),
			scopes: tokenData.scope || null,
			fortnox_customer_number: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Customer number is set manually by user - not fetched from company information
		// Company information contains the organization's own customer number in Fortnox,
		// not the customer number of the customers they invoice to
		const fortnoxCustomerNumber: string | null = null;

		// Store connection in database
		const supabase = await createClient();
		const { error: dbError } = await supabase
			.from('fortnox_connections')
			.upsert({
				org_id: stateData.orgId,
				access_token: tokenData.access_token,
				refresh_token: tokenData.refresh_token,
				access_token_expires_at: expiresAt.toISOString(),
				scopes: tokenData.scope || null,
				fortnox_customer_number: fortnoxCustomerNumber,
			}, {
				onConflict: 'org_id',
			});

		if (dbError) {
			console.error('Failed to save Fortnox connection:', dbError);
			return NextResponse.redirect(
				new URL(
					'/dashboard/settings/fortnox?fortnox_error=database_error',
					request.url
				)
			);
		}

		// Success - redirect back to settings
		return NextResponse.redirect(
			new URL(
				'/dashboard/settings/fortnox?fortnox_connected=success',
				request.url
			)
		);
	} catch (error) {
		console.error('Error in Fortnox OAuth callback:', error);
		return NextResponse.redirect(
			new URL(
				'/dashboard/settings/fortnox?fortnox_error=unexpected_error',
				request.url
			)
		);
	}
}

