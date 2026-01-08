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

		// Generate slug from company name (required field)
		const generateSlug = (name: string): string => {
			return name
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
				.replace(/\s+/g, '-') // Replace spaces with hyphens
				.replace(/-+/g, '-') // Replace multiple hyphens with single
				.trim()
				.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
		};

		let slug = generateSlug(companyName);
		
		// Ensure slug is not empty
		if (!slug) {
			slug = `org-${Date.now()}`;
		} else {
			// Check if slug exists and make it unique if needed
			let uniqueSlug = slug;
			let counter = 1;
			const maxAttempts = 100; // Safety limit
			
			for (let i = 0; i < maxAttempts; i++) {
				const { data: existing } = await supabase
					.from('organizations')
					.select('id')
					.eq('slug', uniqueSlug)
					.maybeSingle();
				
				if (!existing) {
					slug = uniqueSlug;
					break;
				}
				uniqueSlug = `${slug}-${counter}`;
				counter++;
			}
			
			// Fallback if all attempts failed (shouldn't happen)
			if (counter >= maxAttempts) {
				slug = `${slug}-${Date.now()}`;
			}
		}

		// Check if organization number already exists
		const { data: existingOrg } = await supabase
			.from('organizations')
			.select('id, name, org_number')
			.eq('org_number', orgNumber)
			.maybeSingle();

		if (existingOrg) {
			return NextResponse.json(
				{ error: `Organisationsnummer ${orgNumber} finns redan (organisation: ${existingOrg.name}). Var vänlig kontrollera organisationsnumret eller kontakta support om du tror att detta är ett fel.` },
				{ status: 400 }
			);
		}

		// Create organization
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.insert({
				name: companyName,
				slug: slug,
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
			// Check if it's a unique constraint violation
			if (orgError.code === '23505' && orgError.message.includes('org_number')) {
				return NextResponse.json(
					{ error: `Organisationsnummer ${orgNumber} finns redan. Var vänlig kontrollera organisationsnumret eller kontakta support.` },
					{ status: 400 }
				);
			}
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

