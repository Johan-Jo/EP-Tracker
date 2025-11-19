import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * POST /api/integrations/fortnox/payroll-mappings/employees
 * Create a new employee mapping
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
		const { person_id, fortnox_employee_id } = body;

		if (!person_id || !fortnox_employee_id) {
			return NextResponse.json(
				{ error: 'person_id och fortnox_employee_id krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const { data, error } = await supabase
			.from('fortnox_employee_mappings')
			.insert({
				org_id: membership.org_id,
				person_id,
				fortnox_employee_id: fortnox_employee_id.trim(),
			})
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				// Unique constraint violation
				return NextResponse.json(
					{ error: 'Mappning för denna anställd finns redan' },
					{ status: 400 }
				);
			}
			console.error('Error creating employee mapping:', error);
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

