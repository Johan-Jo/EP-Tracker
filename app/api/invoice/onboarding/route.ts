import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * POST /api/invoice/onboarding
 * 
 * Marks invoice onboarding as completed for the user's organization.
 * Both Admin and Finance users can complete this onboarding.
 */
export async function POST() {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Both admin and finance can complete onboarding
		if (membership.role !== 'admin' && membership.role !== 'finance') {
			return NextResponse.json(
				{ error: 'Endast administratörer och ekonomi kan slutföra onboarding' },
				{ status: 403 }
			);
		}

		const supabase = await createClient();

		// Check if already completed
		const { data: org } = await supabase
			.from('organizations')
			.select('invoice_onboarding_completed_at')
			.eq('id', membership.org_id)
			.single();

		if (org?.invoice_onboarding_completed_at) {
			return NextResponse.json({ 
				success: true, 
				message: 'Onboarding redan slutförd',
				completed_at: org.invoice_onboarding_completed_at 
			});
		}

		// Mark onboarding as completed
		const { error } = await supabase
			.from('organizations')
			.update({
				invoice_onboarding_completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', membership.org_id);

		if (error) {
			console.error('Error completing invoice onboarding:', error);
			return NextResponse.json(
				{ error: 'Kunde inte slutföra onboarding' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ 
			success: true,
			message: 'Onboarding slutförd'
		});
	} catch (error) {
		console.error('Invoice onboarding error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

