import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const { companyName, orgNumber, phone, address, postalCode, city } =
			await request.json();

		if (!companyName || !orgNumber) {
			return NextResponse.json(
				{ error: 'Företagsnamn och organisationsnummer krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Get authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Create organization
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
			return NextResponse.json({ error: orgError.message }, { status: 500 });
		}

		if (!org) {
			return NextResponse.json(
				{ error: 'Kunde inte skapa organisation' },
				{ status: 500 }
			);
		}

		// Create membership (user as admin of their organization)
		const { error: membershipError } = await supabase.from('memberships').insert({
			user_id: user.id,
			org_id: org.id,
			role: 'admin',
			is_active: true,
		});

		if (membershipError) {
			console.error('Membership creation error:', membershipError);
			return NextResponse.json({ error: membershipError.message }, { status: 500 });
		}

		return NextResponse.json({
			message: 'Organisation skapad!',
			organization: org,
		});
	} catch (error) {
		console.error('Complete organization error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

