import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const { email } = await request.json();

		if (!email) {
			return NextResponse.json(
				{ error: 'E-post krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();
		
		// Get the origin from the request to ensure correct redirect
		const requestUrl = new URL(request.url);
		// Use explicit production URL if available, otherwise use request origin
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
		const redirectTo = `${siteUrl}/api/auth/callback`;
		
		console.log('=== MAGIC LINK REQUEST ===');
		console.log('[MAGIC LINK] Sending magic link to:', email);
		console.log('[MAGIC LINK] Request origin:', requestUrl.origin);
		console.log('[MAGIC LINK] Site URL from env:', process.env.NEXT_PUBLIC_SITE_URL);
		console.log('[MAGIC LINK] Final redirect URL:', redirectTo);
		console.log('[MAGIC LINK] Environment:', process.env.NODE_ENV);

		const { data, error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: redirectTo,
				shouldCreateUser: false, // Only allow existing users to sign in with magic link
			},
		});

		if (error) {
			console.error('[MAGIC LINK] Error:', error.message);
			console.error('[MAGIC LINK] Error details:', JSON.stringify(error, null, 2));
			return NextResponse.json(
				{ error: error.message },
				{ status: 400 }
			);
		}

		console.log('[MAGIC LINK] Success! Magic link sent.');
		console.log('[MAGIC LINK] Response data:', data);
		console.log('=== MAGIC LINK REQUEST END ===');

		return NextResponse.json({
			message: 'Inloggningslänk skickad till din e-post',
		});
	} catch (error) {
		console.error('Magic link error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

