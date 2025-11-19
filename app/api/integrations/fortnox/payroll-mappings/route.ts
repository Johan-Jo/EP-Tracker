import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/payroll-mappings
 * Get employee and wage code mappings for the organization
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Users with admin, finance, or foreman role can view mappings
		if (!['admin', 'finance', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const supabase = await createClient();

		// Fetch employee mappings with person details
		const { data: employeeMappings, error: employeeError } = await supabase
			.from('fortnox_employee_mappings')
			.select(`
				*,
				person:profiles!fortnox_employee_mappings_person_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false });

		if (employeeError) {
			console.error('Error fetching employee mappings:', employeeError);
			return NextResponse.json(
				{ error: 'Kunde inte hämta employee-mappningar' },
				{ status: 500 }
			);
		}

		// Fetch wage code mappings
		const { data: wageCodeMappings, error: wageCodeError } = await supabase
			.from('fortnox_wage_code_mappings')
			.select('*')
			.eq('org_id', membership.org_id)
			.order('ep_wage_type', { ascending: true });

		if (wageCodeError) {
			console.error('Error fetching wage code mappings:', wageCodeError);
			return NextResponse.json(
				{ error: 'Kunde inte hämta wage code-mappningar' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			employeeMappings: employeeMappings || [],
			wageCodeMappings: wageCodeMappings || [],
		});
	} catch (error) {
		console.error('[Fortnox Payroll Mappings] Error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

