import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const next = requestUrl.searchParams.get('next') || '/dashboard';

	console.log('[AUTH CALLBACK] Starting with code:', code ? 'present' : 'missing');

	if (code) {
		const supabase = await createClient();
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

		console.log('[AUTH CALLBACK] Exchange result:', { 
			hasSession: !!data.session, 
			hasUser: !!data.user, 
			error: error?.message 
		});

		if (!error && data.session) {
			// Check if user has a membership (completed signup)
			const { data: { user } } = await supabase.auth.getUser();
			
			console.log('[AUTH CALLBACK] User authenticated:', user?.id);
			
			if (user) {
				const { data: membership, error: membershipError } = await supabase
					.from('memberships')
					.select('id')
					.eq('user_id', user.id)
					.eq('is_active', true)
					.maybeSingle();

				console.log('[AUTH CALLBACK] Membership check:', { 
					hasMembership: !!membership, 
					error: membershipError?.message 
				});

				// If membership exists, go to dashboard. Otherwise, go to complete-setup
				const redirectUrl = membership ? '/dashboard' : '/complete-setup';
				console.log('[AUTH CALLBACK] Redirecting to:', redirectUrl);
				return NextResponse.redirect(new URL(redirectUrl, request.url));
			}

			// Default redirect if user exists but something weird happened
			console.log('[AUTH CALLBACK] No user found, redirecting to:', next);
			return NextResponse.redirect(new URL(next, request.url));
		} else {
			// Log the specific error
			console.error('[AUTH CALLBACK] Error exchanging code:', error?.message);
			
			// If code was already used or expired, redirect to sign-in
			if (error?.message?.includes('already been used') || error?.message?.includes('expired')) {
				return NextResponse.redirect(new URL('/sign-in?error=link_expired', request.url));
			}
		}
	}

	// Return the user to an error page with instructions
	console.error('[AUTH CALLBACK] No valid code or session, redirecting to sign-in');
	return NextResponse.redirect(new URL('/sign-in?error=auth_callback_error', request.url));
}

