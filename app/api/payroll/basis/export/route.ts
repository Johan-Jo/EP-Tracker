import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/payroll/basis/export
 * 
 * Export payroll basis data as CSV or PDF
 * 
 * Query params:
 * - start: period start date (YYYY-MM-DD)
 * - end: period end date (YYYY-MM-DD)
 * - format: 'csv' or 'pdf' (default: 'csv')
 * - person_id: optional person ID to filter
 * - locked_only: boolean (default: false) - only export locked entries
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can export payroll basis
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');
		const format = searchParams.get('format') || 'csv';
		const personId = searchParams.get('person_id');
		const lockedOnly = searchParams.get('locked_only') === 'true';

		if (!periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'start and end parameters are required (YYYY-MM-DD)' },
				{ status: 400 }
			);
		}

		if (format !== 'csv' && format !== 'pdf') {
			return NextResponse.json(
				{ error: 'format must be "csv" or "pdf"' },
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

		// Filter by locked status if requested
		if (lockedOnly) {
			query = query.eq('locked', true);
		}

		const { data: payrollBasis, error } = await query;

		if (error) {
			console.error('Error fetching payroll basis for export:', error);
			return NextResponse.json({ error: 'Failed to fetch payroll basis' }, { status: 500 });
		}

		if (!payrollBasis || payrollBasis.length === 0) {
			return NextResponse.json(
				{ error: 'No payroll basis data found for the specified period' },
				{ status: 404 }
			);
		}

		// Generate export based on format
		if (format === 'csv') {
			const csv = generatePayrollCSV(payrollBasis);
			const filename = `loneunderlag_${periodStart}_${periodEnd}.csv`;

			return new NextResponse(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`,
				},
			});
		} else {
			// PDF export - for now return error, implement later
			return NextResponse.json(
				{ error: 'PDF export not yet implemented' },
				{ status: 501 }
			);
		}
	} catch (error) {
		console.error('Error in GET /api/payroll/basis/export:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Generate CSV content for payroll basis export
 */
function generatePayrollCSV(data: any[]): string {
	// CSV Header
	const headers = [
		'Person',
		'E-post',
		'Period Start',
		'Period End',
		'Normaltid (h)',
		'Övertid (h)',
		'OB-timmar (h)',
		'Rast (h)',
		'Totalt (h)',
		'Låst',
		'Låst av',
		'Låst datum',
	];

	// CSV Rows
	const rows = data.map((entry) => {
		const personName = entry.person?.full_name || 'Okänd';
		const personEmail = entry.person?.email || '';
		const lockedBy = entry.locked_by || '';
		const lockedAt = entry.locked_at
			? new Date(entry.locked_at).toLocaleString('sv-SE')
			: '';

		return [
			escapeCSV(personName),
			escapeCSV(personEmail),
			formatDate(entry.period_start),
			formatDate(entry.period_end),
			Number(entry.hours_norm).toFixed(2),
			Number(entry.hours_overtime).toFixed(2),
			Number(entry.ob_hours).toFixed(2),
			Number(entry.break_hours).toFixed(2),
			Number(entry.total_hours).toFixed(2),
			entry.locked ? 'Ja' : 'Nej',
			escapeCSV(lockedBy),
			escapeCSV(lockedAt),
		];
	});

	// Combine header and rows
	const csvLines = [headers.join(',')].concat(rows.map((row) => row.join(',')));

	// Add BOM for UTF-8 Excel compatibility
	return '\uFEFF' + csvLines.join('\n');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
	if (value === null || value === undefined) {
		return '';
	}

	const stringValue = String(value);

	// If value contains comma, quote, or newline, wrap in quotes and escape quotes
	if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}

	return stringValue;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	} catch {
		return dateString;
	}
}

