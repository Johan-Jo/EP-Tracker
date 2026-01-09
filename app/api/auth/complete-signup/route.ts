import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';

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
			campaignCode,
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

		// Now use service role client for checking email and creating org/membership (bypass RLS)
		const supabaseAdmin = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			}
		);

		// Check if email already exists in profiles table (quicker than checking auth.users)
		const { data: existingEmailProfile } = await supabaseAdmin
			.from('profiles')
			.select('id, email')
			.eq('email', email)
			.maybeSingle();

		if (existingEmailProfile) {
			return NextResponse.json(
				{ error: 'E-postadressen finns redan. Använd en annan e-postadress eller logga in.' },
				{ status: 400 }
			);
		}

		// First, use regular signUp to create user and send verification email automatically
		const supabaseClient = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);

		// 1. Sign up the user - this automatically sends verification email
		const { data: authData, error: authError } = await supabaseClient.auth.signUp({
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
			console.error('Auth error:', authError);
			// Check if it's an email already exists error
			if (authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('email')) {
				return NextResponse.json(
					{ error: 'E-postadressen finns redan. Använd en annan e-postadress eller logga in.' },
					{ status: 400 }
				);
			}
			return NextResponse.json({ error: authError.message }, { status: 400 });
		}

		if (!authData.user) {
			return NextResponse.json(
				{ error: 'Kunde inte skapa användare' },
				{ status: 500 }
			);
		}

		// Generate slug from company name (required field)
		// Convert to lowercase, remove special chars, replace spaces with hyphens
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
				const { data: existing } = await supabaseAdmin
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
		const { data: existingOrg } = await supabaseAdmin
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

		// 2. Create organization (using admin client to bypass RLS)
		const { data: org, error: orgError } = await supabaseAdmin
			.from('organizations')
			.insert({
				name: companyName,
				slug: slug,
				org_number: orgNumber,
				phone,
				address,
				postal_code: postalCode,
				city,
				campaign_code: campaignCode || null,
			})
			.select()
			.single();

		if (orgError) {
			console.error('Organization creation error:', orgError);
			// Include more details in development for debugging
			const errorMessage = process.env.NODE_ENV === 'development' 
				? `Kunde inte skapa organisation: ${orgError.message}`
				: 'Kunde inte skapa organisation';
			return NextResponse.json(
				{ error: errorMessage, details: process.env.NODE_ENV === 'development' ? orgError : undefined },
				{ status: 500 }
			);
		}

		// 3. Ensure profile exists before creating membership
		// Wait a bit for trigger to complete, then check and create if needed
		await new Promise(resolve => setTimeout(resolve, 500));

		let profileExists = false;
		let profileError = null;
		let retries = 3;

		// Retry logic for profile creation (trigger might take time)
		while (retries > 0 && !profileExists) {
			// First check if profile exists
			const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
				.from('profiles')
				.select('id')
				.eq('id', authData.user.id)
				.maybeSingle();

			if (existingProfile) {
				profileExists = true;
				break;
			}

			// If profile doesn't exist, try to create it with upsert
			const { error: profileCreateError } = await supabaseAdmin
				.from('profiles')
				.upsert({
					id: authData.user.id,
					email: authData.user.email!,
					full_name: fullName,
				}, {
					onConflict: 'id',
				});

			if (profileCreateError) {
				profileError = profileCreateError;
				console.error(`Profile creation attempt failed (${retries} retries left):`, profileCreateError);
				
				// If it's a duplicate email error, return immediately
				if (profileCreateError.code === '23505') {
					return NextResponse.json(
						{ error: 'E-postadressen finns redan. Använd en annan e-postadress eller logga in.' },
						{ status: 400 }
					);
				}

				// If it's a foreign key error, wait a bit and retry (user might not be fully committed yet)
				if (profileCreateError.code === '23503' && retries > 1) {
					await new Promise(resolve => setTimeout(resolve, 1000));
					retries--;
					continue;
				}

				// For other errors or final retry, return error
				if (retries === 1) {
					return NextResponse.json(
						{ error: 'Kunde inte skapa profil', details: process.env.NODE_ENV === 'development' ? profileCreateError.message : undefined },
						{ status: 500 }
					);
				}
			} else {
				profileExists = true;
				break;
			}

			retries--;
			if (retries > 0) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		if (!profileExists && profileError) {
			return NextResponse.json(
				{ error: 'Kunde inte skapa profil efter flera försök', details: process.env.NODE_ENV === 'development' ? profileError.message : undefined },
				{ status: 500 }
			);
		}

		// Wait a bit for any async triggers to complete, then retry if needed
		let membershipError;
		let retries = 3;
		
		while (retries > 0) {
			const result = await supabaseAdmin.from('memberships').insert({
				user_id: authData.user.id,
				org_id: org.id,
				role: 'admin',
				is_active: true,
			});
			
			membershipError = result.error;
			
			if (!membershipError) {
				break; // Success!
			}
			
			// If it's a foreign key error, profile might not exist yet
			if (membershipError.code === '23503' && retries > 1) {
				// Wait a bit and try again
				await new Promise(resolve => setTimeout(resolve, 500));
				retries--;
				continue;
			}
			
			break;
		}

		if (membershipError) {
			console.error('Membership creation error:', membershipError);
			return NextResponse.json(
				{ error: 'Kunde inte skapa medlemskap', details: process.env.NODE_ENV === 'development' ? membershipError.message : undefined },
				{ status: 500 }
			);
		}

		// Send welcome email (in background, don't wait for it)
		sendEmail({
			to: email,
			toName: fullName,
			subject: 'Välkommen till EP Tracker!',
			template: 'welcome',
			templateData: {
				userName: fullName,
				organizationName: companyName,
				dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
			},
			organizationId: org.id,
			emailType: 'transactional',
			sentBy: 'system',
		})
			.then((result) => {
				if (result.success) {
					console.log('✅ Welcome email sent successfully to:', email);
				} else {
					console.error('❌ Failed to send welcome email to:', email, result.error);
				}
			})
			.catch((error) => {
				// Log error but don't fail the signup if email fails
				console.error('❌ Error sending welcome email to:', email, error);
			});

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

