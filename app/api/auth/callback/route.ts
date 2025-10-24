import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const next = requestUrl.searchParams.get('next') || '/dashboard';

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			// Check if user has a membership (completed signup)
			const { data: { user } } = await supabase.auth.getUser();
			
			if (user) {
				const { data: membership } = await supabase
					.from('memberships')
					.select('id')
					.eq('user_id', user.id)
					.eq('is_active', true)
					.maybeSingle();

				// If membership exists, go to dashboard. Otherwise, go to complete-setup
				const redirectUrl = membership ? '/dashboard' : '/complete-setup';
				return NextResponse.redirect(new URL(redirectUrl, request.url));
			}

			// Default redirect
			return NextResponse.redirect(new URL(next, request.url));
		}
	}

	// Return the user to an error page with instructions
	return NextResponse.redirect(new URL('/sign-in?error=auth_callback_error', request.url));
}

