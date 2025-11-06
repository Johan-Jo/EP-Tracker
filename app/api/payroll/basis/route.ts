import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/payroll/basis
 * 
 * Fetch payroll basis data for a period
 * Phase 1: Read-only view - sums from attendance_session/time_entries
 * 
 * Query params:
 * - start: period start date (YYYY-MM-DD)
 * - end: period end date (YYYY-MM-DD)
 * - person_id: optional filter by person
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can view payroll basis
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');
		const personId = searchParams.get('person_id');

		if (!periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'start and end parameters are required (YYYY-MM-DD)' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Build query for payroll_basis
		let query = supabase
			.from('payroll_basis')
			.select(`
				*,
				person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.gte('period_end', periodStart)
			.lte('period_start', periodEnd)
			.order('period_start', { ascending: false })
			.order('person_id', { ascending: true });

		// Filter by person if specified
		if (personId) {
			query = query.eq('person_id', personId);
		}

		const { data: payrollBasis, error } = await query;

		if (error) {
			console.error('Error fetching payroll basis:', error);
			return NextResponse.json({ error: 'Failed to fetch payroll basis' }, { status: 500 });
		}

		return NextResponse.json({ payroll_basis: payrollBasis || [] });
	} catch (error) {
		console.error('Error in GET /api/payroll/basis:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

