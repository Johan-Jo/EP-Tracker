import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * POST /api/integrations/fortnox/payroll-mappings/wage-codes
 * Create a new wage code mapping
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { ep_wage_type, fortnox_salary_code, description } = body;

		if (!ep_wage_type || !fortnox_salary_code) {
			return NextResponse.json(
				{ error: 'ep_wage_type och fortnox_salary_code krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const { data, error } = await supabase
			.from('fortnox_wage_code_mappings')
			.insert({
				org_id: membership.org_id,
				ep_wage_type,
				fortnox_salary_code: fortnox_salary_code.trim(),
				description: description || null,
				is_active: true,
			})
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				// Unique constraint violation
				return NextResponse.json(
					{ error: 'Mappning för denna lönetyp finns redan' },
					{ status: 400 }
				);
			}
			console.error('Error creating wage code mapping:', error);
			return NextResponse.json(
				{ error: 'Kunde inte skapa mappning' },
				{ status: 500 }
			);
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error('[Fortnox Payroll Mappings] Error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

