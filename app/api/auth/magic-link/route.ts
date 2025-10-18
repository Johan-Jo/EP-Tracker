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

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
			},
		});

		if (error) {
			return NextResponse.json(
				{ error: error.message },
				{ status: 400 }
			);
		}

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

