import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { refreshPayrollBasis } from '@/lib/jobs/basis-refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function respond(body: unknown, status = 200) {
	return NextResponse.json(body, {
		status,
		headers: {
			'Cache-Control': 'no-store',
		},
	});
}

/**
 * POST /api/payroll/basis/refresh
 * 
 * Manually trigger payroll basis calculation/refresh
 * Phase 2: Rules engine - calculates from attendance_session/time_entries
 * 
 * Body:
 * - start: period start date (YYYY-MM-DD)
 * - end: period end date (YYYY-MM-DD)
 * - person_ids: optional array of person IDs to process
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return respond({ error: 'Unauthorized' }, 401);
		}

		// Only admin and foreman can refresh payroll basis
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return respond({ error: 'Forbidden' }, 403);
		}

		const body = await request.json();
		const { start, end, person_ids } = body;

		if (!start || !end) {
			return respond(
				{ error: 'start and end parameters are required (YYYY-MM-DD)' },
				400,
			);
		}

		// Refresh payroll basis
		try {
			await refreshPayrollBasis(
				membership.org_id,
				start,
				end,
				person_ids || undefined
			);

			return respond({ 
				success: true,
				message: 'Payroll basis refreshed successfully'
			});
		} catch (refreshError) {
			// If no data found, return success but with info message
			if (refreshError instanceof Error && refreshError.message.includes('No data')) {
				return respond({ 
					success: true,
					message: 'Ingen data hittades för denna period. Kontrollera att det finns närvaroregistreringar eller godkända tidsregistreringar.',
					warning: true,
				});
			}
			throw refreshError;
		}
	} catch (error) {
		console.error('Error in POST /api/payroll/basis/refresh:', error);
		return respond(
			{ 
				error: 'Failed to refresh payroll basis',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			500,
		);
	}
}

