import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// Ensure this route runs in Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds timeout

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
		// Find records where period overlaps with requested period:
		// period_start <= periodEnd AND period_end >= periodStart
		let query = supabase
			.from('payroll_basis')
			.select(`
				*,
				person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.lte('period_start', periodEnd)
			.gte('period_end', periodStart);
		
		// Filter by person if specified
		if (personId) {
			query = query.eq('person_id', personId);
		}
		
		// Order and limit to avoid timeout
		query = query
			.order('period_start', { ascending: false })
			.order('person_id', { ascending: true })
			.limit(1000); // Limit to prevent timeout

		const { data: payrollBasis, error } = await query;

		if (error) {
			console.error('Error fetching payroll basis:', error);
			console.error('Query params:', { periodStart, periodEnd, personId, orgId: membership.org_id });
			console.error('Error details:', JSON.stringify(error, null, 2));
			return NextResponse.json({ 
				error: 'Failed to fetch payroll basis',
				details: error.message,
				code: error.code,
				hint: error.hint
			}, { status: 500 });
		}

		return NextResponse.json({ payroll_basis: payrollBasis || [] });
	} catch (error) {
		console.error('Error in GET /api/payroll/basis:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('Error stack:', errorStack);
		return NextResponse.json({ 
			error: 'Internal server error',
			details: errorMessage
		}, { status: 500 });
	}
}

