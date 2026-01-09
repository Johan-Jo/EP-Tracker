import { createClient, createAdminClient } from '@/lib/supabase/server';
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
			// Log the actual error for debugging (server-side only)
			console.error('Sign-in error details:', {
				email: email.toLowerCase(),
				errorMessage: error.message,
				errorStatus: error.status,
				fullError: error
			});

			// Always check if user exists and email confirmation status when we get a login error
			// This helps us provide better error messages for common issues
			try {
				const adminClient = createAdminClient();
				
				// Check profiles first (faster and more reliable)
				const { data: profile } = await adminClient
					.from('profiles')
					.select('id')
					.eq('email', email.toLowerCase())
					.maybeSingle();
				
				if (profile) {
					// User exists in profiles, check auth status
					const { data: authUserData, error: getUserError } = await adminClient.auth.admin.getUserById(profile.id);
					
					if (!getUserError && authUserData?.user) {
						const authUser = authUserData.user;
						
						// Check if email is not confirmed - this is a common issue
						if (!authUser.email_confirmed_at && !authUser.confirmed_at) {
							console.log('User email not confirmed:', email);
							return NextResponse.json(
								{ 
									error: 'Din e-postadress är inte bekräftad. Vänligen kontrollera din inkorg för ett bekräftelsemeddelande och följ instruktionerna för att aktivera ditt konto. Om du inte har fått något e-postmeddelande, kontakta support.',
									code: 'EMAIL_NOT_CONFIRMED'
								},
								{ status: 401 }
							);
						}

						// Check if account is banned
						if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
							console.log('User account is banned:', email);
							return NextResponse.json(
								{ 
									error: 'Ditt konto är tillfälligt avstängt. Kontakta support om du behöver hjälp.',
									code: 'ACCOUNT_BANNED'
								},
								{ status: 403 }
							);
						}

						// If user exists and email is confirmed but login still fails, it's likely wrong password
						// We'll fall through to generic error message below
					}
				}
			} catch (adminError) {
				// If admin check fails, log but don't expose to user
				console.error('Error checking user email confirmation status:', adminError);
			}

			// Generic error message for security (don't reveal if user exists)
			// This covers: wrong password, user doesn't exist, or other auth issues
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

