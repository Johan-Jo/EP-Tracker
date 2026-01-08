import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// GET /api/profile/theme - return current user's theme preference
export async function GET() {
	try {
		const { user } = await getSession();

		// Return null theme if user is not authenticated (e.g., during signup)
		// This prevents 401 errors in the console during registration
		if (!user) {
			return NextResponse.json({ theme: null });
		}

		// In demo mode, return default theme (no database query needed)
		if (user.id === 'demo-user-id') {
			return NextResponse.json({ theme: null });
		}

		const supabase = await createClient();
		const { data, error } = await supabase
			.from('profiles')
			.select('theme_preference')
			.eq('id', user.id)
			.single();

		if (error) {
			console.error('[GET /api/profile/theme] Error:', error);
			return NextResponse.json({ error: 'Kunde inte läsa temainställning' }, { status: 500 });
		}

		const theme = data?.theme_preference;
		return NextResponse.json({ theme: theme === 'dark' || theme === 'light' ? theme : null });
	} catch (error) {
		console.error('[GET /api/profile/theme] Unexpected error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

// POST /api/profile/theme - update current user's theme preference
export async function POST(request: NextRequest) {
	try {
		const { user } = await getSession();

		// Silently ignore theme updates if user is not authenticated
		// This prevents 401 errors during registration flow
		if (!user) {
			return NextResponse.json({ success: true, theme: null });
		}

		// In demo mode, return success but don't save (read-only)
		if (user.id === 'demo-user-id') {
			const body = await request.json().catch(() => ({}));
			const theme = body?.theme;
			if (theme !== 'light' && theme !== 'dark') {
				return NextResponse.json({ error: 'Ogiltigt tema. Måste vara \"light\" eller \"dark\".' }, { status: 400 });
			}
			// Return success but don't persist in demo mode
			return NextResponse.json({ success: true, theme });
		}

		const body = await request.json().catch(() => ({}));
		const theme = body?.theme;

		if (theme !== 'light' && theme !== 'dark') {
			return NextResponse.json({ error: 'Ogiltigt tema. Måste vara \"light\" eller \"dark\".' }, { status: 400 });
		}

		const supabase = await createClient();
		const { error } = await supabase
			.from('profiles')
			.update({ theme_preference: theme })
			.eq('id', user.id);

		if (error) {
			console.error('[POST /api/profile/theme] Error:', error);
			return NextResponse.json({ error: 'Kunde inte spara temainställning' }, { status: 500 });
		}

		return NextResponse.json({ success: true, theme });
	} catch (error) {
		console.error('[POST /api/profile/theme] Unexpected error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}


