import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const { email, password, fullName } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'E-post och lösenord krävs' },
				{ status: 400 }
			);
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: 'Lösenordet måste vara minst 8 tecken' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Sign up the user with auto-confirm to allow immediate login
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
				},
				emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
			},
		});

		if (authError) {
			return NextResponse.json(
				{ error: authError.message },
				{ status: 400 }
			);
		}

		if (!authData.user) {
			return NextResponse.json(
				{ error: 'Kunde inte skapa användare' },
				{ status: 500 }
			);
		}

		// Note: Profile is automatically created by database trigger
		// Session is automatically created by signUp, user is now authenticated

		return NextResponse.json({
			message: 'Registrering lyckades!',
			user: authData.user,
			session: authData.session,
		});
	} catch (error) {
		console.error('Signup error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

