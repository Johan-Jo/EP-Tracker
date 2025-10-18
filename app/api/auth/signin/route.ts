import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'E-post och lösenord krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			return NextResponse.json(
				{ error: 'Fel e-post eller lösenord' },
				{ status: 401 }
			);
		}

		if (!data.user) {
			return NextResponse.json(
				{ error: 'Kunde inte logga in' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			message: 'Inloggning lyckades',
			user: data.user,
		});
	} catch (error) {
		console.error('Signin error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

