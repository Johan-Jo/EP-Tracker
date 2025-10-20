import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get('code');
	const next = requestUrl.searchParams.get('next') || '/welcome';

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			// After email verification, redirect to welcome page
			return NextResponse.redirect(new URL(next, request.url));
		}
	}

	// Return the user to an error page with instructions
	return NextResponse.redirect(new URL('/sign-in?error=auth_callback_error', request.url));
}

