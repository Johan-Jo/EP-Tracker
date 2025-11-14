import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

/**
 * GET /api/subcontractors/[id]/invoices
 * Generate invoice for a subcontractor based on approved time entries
 */
export async function GET(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);
		const subcontractorId = params.id;

		if (!subcontractorId) {
			return NextResponse.json({ error: 'Subcontractor ID is required' }, { status: 400 });
		}

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can generate invoices
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan generera fakturor' },
				{ status: 403 }
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');

		if (!periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'start and end parameters are required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Verify subcontractor exists and belongs to organization
		const { data: subcontractor, error: subError } = await supabase
			.from('subcontractors')
			.select('*, profiles:user_id(id, full_name, email)')
			.eq('id', subcontractorId)
			.eq('org_id', membership.org_id)
			.single();

		if (subError || !subcontractor) {
			return NextResponse.json(
				{ error: 'Underentreprenör hittades inte' },
				{ status: 404 }
			);
		}

		// Fetch approved time entries for this subcontractor in the period
		const { data: timeEntries, error: timeError } = await supabase
			.from('time_entries')
			.select(`
				*,
				project:projects(name, project_number),
				phase:phases(name)
			`)
			.eq('org_id', membership.org_id)
			.eq('subcontractor_id', subcontractorId)
			.eq('status', 'approved')
			.gte('start_at', periodStart)
			.lte('start_at', periodEnd)
			.order('start_at', { ascending: true });

		if (timeError) {
			console.error('[API] Error fetching time entries:', timeError);
			return NextResponse.json({ error: timeError.message }, { status: 500 });
		}

		// Calculate invoice totals
		let totalHours = 0;
		let totalAmount = 0;
		const hourlyRate = subcontractor.hourly_rate_sek ?? 0;

		for (const entry of timeEntries || []) {
			if (entry.duration_min) {
				const hours = entry.duration_min / 60;
				totalHours += hours;
				totalAmount += hours * hourlyRate;
			}
		}

		// Calculate VAT
		const vatRate = subcontractor.default_vat_rate ?? 25;
		const vatAmount = (totalAmount * vatRate) / 100;
		const totalWithVat = totalAmount + vatAmount;

		// Group time entries by project and phase for invoice lines
		const invoiceLines = new Map<string, {
			project: { name: string; project_number: string | null };
			phase: { name: string } | null;
			hours: number;
			amount: number;
			entries: typeof timeEntries;
		}>();

		for (const entry of timeEntries || []) {
			if (!entry.duration_min) continue;

			const key = `${entry.project_id}:${entry.phase_id || 'no-phase'}`;
			const hours = entry.duration_min / 60;
			const amount = hours * hourlyRate;

			const existing = invoiceLines.get(key);
			if (existing) {
				existing.hours += hours;
				existing.amount += amount;
				existing.entries.push(entry);
			} else {
				invoiceLines.set(key, {
					project: entry.project as { name: string; project_number: string | null },
					phase: entry.phase as { name: string } | null,
					hours,
					amount,
					entries: [entry],
				});
			}
		}

		return NextResponse.json({
			subcontractor: {
				id: subcontractor.id,
				subcontractor_no: subcontractor.subcontractor_no,
				company_name: subcontractor.company_name,
				org_no: subcontractor.org_no,
				hourly_rate_sek: hourlyRate,
				default_vat_rate: vatRate,
			},
			period: {
				start: periodStart,
				end: periodEnd,
			},
			summary: {
				total_hours: Math.round(totalHours * 100) / 100,
				total_amount: Math.round(totalAmount * 100) / 100,
				vat_rate: vatRate,
				vat_amount: Math.round(vatAmount * 100) / 100,
				total_with_vat: Math.round(totalWithVat * 100) / 100,
				entry_count: timeEntries?.length || 0,
			},
			lines: Array.from(invoiceLines.values()).map((line) => ({
				project_name: line.project.name,
				project_number: line.project.project_number,
				phase_name: line.phase?.name || null,
				hours: Math.round(line.hours * 100) / 100,
				amount: Math.round(line.amount * 100) / 100,
				entry_count: line.entries.length,
			})),
			time_entries: timeEntries || [],
		}, { status: 200 });
	} catch (error) {
		console.error('[API] Unexpected error in GET /api/subcontractors/:id/invoices:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

