import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Debug endpoint to diagnose session issues
 * Only works for authenticated users
 * 
 * Call this endpoint if you're experiencing unexpected logouts
 */
export async function GET() {
	try {
		const cookieStore = await cookies();
		const allCookies = cookieStore.getAll();
		
		// Get auth-related cookies (redact values for security)
		const authCookies = allCookies
			.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
			.map(c => ({
				name: c.name,
				hasValue: !!c.value,
				length: c.value?.length || 0,
			}));

		// Test Supabase connection directly
		const supabase = await createClient();
		
		// Test 1: Get user directly
		const { data: userData, error: userError } = await supabase.auth.getUser();
		
		// Test 2: Get session (cached version)
		const session = await getSession();
		
		// Test 3: If we have a user, test membership query directly
		let membershipTest = null;
		let profileTest = null;
		
		if (userData.user) {
			const { data: membership, error: membershipError } = await supabase
				.from('memberships')
				.select('org_id, role, is_active')
				.eq('user_id', userData.user.id)
				.eq('is_active', true)
				.single();
			
			membershipTest = {
				found: !!membership,
				error: membershipError ? {
					code: membershipError.code,
					message: membershipError.message,
					details: membershipError.details,
					hint: membershipError.hint,
				} : null,
				role: membership?.role || null,
			};
			
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('id, email, full_name')
				.eq('id', userData.user.id)
				.single();
			
			profileTest = {
				found: !!profile,
				error: profileError ? {
					code: profileError.code,
					message: profileError.message,
				} : null,
			};
		}

		return NextResponse.json({
			timestamp: new Date().toISOString(),
			cookieInfo: {
				totalCookies: allCookies.length,
				authCookies,
			},
			authTest: {
				hasUser: !!userData.user,
				userId: userData.user?.id?.substring(0, 8) + '...' || null,
				email: userData.user?.email || null,
				error: userError ? {
					message: userError.message,
					status: userError.status,
				} : null,
			},
			sessionTest: {
				hasUser: !!session.user,
				hasMembership: !!session.membership,
				hasProfile: !!session.profile,
				role: session.membership?.role || null,
			},
			membershipTest,
			profileTest,
			diagnosis: getDiagnosis(userData, session, membershipTest),
		});
	} catch (error) {
		console.error('[Debug Session] Error:', error);
		return NextResponse.json({
			error: 'Failed to run diagnostics',
			details: error instanceof Error ? error.message : 'Unknown error',
		}, { status: 500 });
	}
}

function getDiagnosis(
	userData: { user: any; error: any },
	session: { user: any; membership: any; profile: any },
	membershipTest: any
): string[] {
	const issues: string[] = [];

	if (!userData.user) {
		issues.push('❌ No authenticated user found - cookies may not be set correctly');
	} else {
		issues.push('✅ User authenticated successfully');
	}

	if (userData.user && !session.membership) {
		if (membershipTest?.error) {
			issues.push(`❌ Membership query failed: ${membershipTest.error.code} - ${membershipTest.error.message}`);
			if (membershipTest.error.code === '42501') {
				issues.push('💡 This is an RLS permission error - check RLS policies');
			}
		} else if (!membershipTest?.found) {
			issues.push('❌ No active membership found - user may not be part of an organization');
		}
	} else if (session.membership) {
		issues.push(`✅ Membership found with role: ${session.membership.role}`);
	}

	if (userData.user && !session.profile) {
		issues.push('⚠️ No profile found - may need to create profile');
	}

	if (issues.length === 0) {
		issues.push('✅ All checks passed - session should work correctly');
	}

	return issues;
}

