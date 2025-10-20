import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const {
			email,
			password,
			fullName,
			companyName,
			orgNumber,
			phone,
			address,
			postalCode,
			city,
		} = await request.json();

		// Validate required fields
		if (!email || !password || !fullName || !companyName || !orgNumber) {
			return NextResponse.json(
				{ error: 'Alla obligatoriska fält måste fyllas i' },
				{ status: 400 }
			);
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: 'Lösenordet måste vara minst 8 tecken' },
				{ status: 400 }
			);
		}

		// Use admin client to bypass RLS for signup
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			}
		);

		// 1. Sign up the user (email verification required)
		const { data: authData, error: authError } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: false, // Require email verification
			user_metadata: {
				full_name: fullName,
			},
		});

		if (authError) {
			return NextResponse.json({ error: authError.message }, { status: 400 });
		}

		if (!authData.user) {
			return NextResponse.json(
				{ error: 'Kunde inte skapa användare' },
				{ status: 500 }
			);
		}

		// 2. Create organization
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.insert({
				name: companyName,
				org_number: orgNumber,
				phone,
				address,
				postal_code: postalCode,
				city,
			})
			.select()
			.single();

		if (orgError) {
			console.error('Organization creation error:', orgError);
			return NextResponse.json(
				{ error: 'Kunde inte skapa organisation' },
				{ status: 500 }
			);
		}

		// 3. Create membership (user as admin)
		const { error: membershipError } = await supabase.from('memberships').insert({
			user_id: authData.user.id,
			org_id: org.id,
			role: 'admin',
			is_active: true,
		});

		if (membershipError) {
			console.error('Membership creation error:', membershipError);
			return NextResponse.json(
				{ error: 'Kunde inte skapa medlemskap' },
				{ status: 500 }
			);
		}

	// Don't auto sign-in, user needs to verify email first
	return NextResponse.json({
		message: 'Registrering slutförd! Kontrollera din e-post för att verifiera ditt konto.',
		user: authData.user,
		organization: org,
	});
	} catch (error) {
		console.error('Complete signup error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

