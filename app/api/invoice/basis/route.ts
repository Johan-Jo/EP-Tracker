import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * POST /api/invoice/basis
 * 
 * Fetches invoice basis data for selected projects and period.
 * Returns approved and pending entries grouped by type.
 * 
 * Input: { projectIds: string[], from: string, to: string }
 * Output: { approved: {...}, pending: {...} }, each grouped by type
 */
export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Allow admin, foreman, and finance roles
		if (membership.role !== 'admin' && membership.role !== 'foreman' && membership.role !== 'finance') {
			return NextResponse.json(
				{ error: 'Endast administratörer, arbetsledare och ekonomi kan visa fakturaunderlag' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { projectIds, from, to } = body;

		if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
			return NextResponse.json(
				{ error: 'projectIds måste vara en array med minst ett projekt' },
				{ status: 400 }
			);
		}

		if (!from || !to) {
			return NextResponse.json(
				{ error: 'from och to datum krävs' },
				{ status: 400 }
			);
		}

		// Validate date range and normalisera till hela dagar (lokal tid)
		const fromDate = new Date(from);
		const toDate = new Date(to);
		if (fromDate > toDate) {
			return NextResponse.json(
				{ error: 'Från-datum måste vara före eller samma som till-datum' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Justera så att vi alltid tar med hela dagar [00:00 – 23:59:59.999] i lokal tid
		const startOfDay = new Date(fromDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(toDate);
		endOfDay.setHours(23, 59, 59, 999);

		// Konvertera till ISO-strängar för databasen
		const startDate = startOfDay.toISOString();
		const endDate = endOfDay.toISOString();

		// Fetch all entries (approved and pending) for the selected projects and period
		// Pending = status 'draft' or 'submitted'
		// Approved = status 'approved'

		const [timeEntriesResult, materialsResult, expensesResult, mileageResult, ataResult] = await Promise.all([
			// Time entries - use start_at for date filtering
			supabase
				.from('time_entries')
				.select(`
					id,
					project_id,
					user_id,
					start_at,
					duration_min,
					task_label,
					notes,
					status,
					approved_by,
					approved_at,
					created_at,
					project:projects(id, name, project_number),
					user:profiles!time_entries_user_id_fkey(id, full_name),
					phase:phases(id, name)
				`)
				.eq('org_id', membership.org_id)
				.in('project_id', projectIds)
				.gte('start_at', startDate)
				.lte('start_at', endDate)
				.in('status', ['draft', 'submitted', 'approved']),

			// Materials - use created_at for date filtering
			supabase
				.from('materials')
				.select(`
					id,
					project_id,
					user_id,
					description,
					qty,
					unit,
					unit_price_sek,
					total_sek,
					status,
					approved_by,
					approved_at,
					created_at,
					project:projects(id, name, project_number),
					user:profiles!materials_user_id_fkey(id, full_name),
					phase:phases(id, name)
				`)
				.eq('org_id', membership.org_id)
				.in('project_id', projectIds)
				.gte('created_at', startDate)
				.lte('created_at', endDate)
				.in('status', ['draft', 'submitted', 'approved']),

			// Expenses - use created_at for date filtering (expenses table doesn't have a date field)
			supabase
				.from('expenses')
				.select(`
					id,
					project_id,
					user_id,
					description,
					amount_sek,
					vat,
					category,
					status,
					approved_by,
					approved_at,
					created_at,
					project:projects(id, name, project_number),
					user:profiles!expenses_user_id_fkey(id, full_name)
				`)
				.eq('org_id', membership.org_id)
				.in('project_id', projectIds)
				.gte('created_at', startDate)
				.lte('created_at', endDate)
				.in('status', ['draft', 'submitted', 'approved']),

			// Mileage - use date field
			supabase
				.from('mileage')
				.select(`
					id,
					project_id,
					user_id,
					date,
					km,
					rate_per_km_sek,
					total_sek,
					from_location,
					to_location,
					notes,
					status,
					approved_by,
					approved_at,
					created_at,
					project:projects(id, name, project_number),
					user:profiles!mileage_user_id_fkey(id, full_name)
				`)
				.eq('org_id', membership.org_id)
				.in('project_id', projectIds)
				.gte('date', from)
				.lte('date', to)
				.in('status', ['draft', 'submitted', 'approved']),

			// ATA - visa alla pågående ÄTA för projektet (oberoende av period).
			// Ta med prismetadata så att vi kan visa samma totalsumma som i ÄTA-detaljvyn.
			supabase
				.from('ata')
				.select(`
					id,
					project_id,
					created_by,
					ata_number,
					title,
					description,
					qty,
					unit,
					unit_price_sek,
					total_sek,
					fixed_amount_sek,
					materials_amount_sek,
					billing_type,
					status,
					approved_by,
					approved_at,
					created_at,
					project:projects(id, name, project_number)
				`)
				.eq('org_id', membership.org_id)
				.in('project_id', projectIds)
				.in('status', ['draft', 'submitted', 'approved']),
		]);

		// Helper function to split entries into approved and pending
		const splitByStatus = <T extends { status: string }>(entries: T[]): { approved: T[]; pending: T[] } => {
			const approved = entries.filter((e) => e.status === 'approved');
			const pending = entries.filter((e) => e.status === 'draft' || e.status === 'submitted');
			return { approved, pending };
		};

		// Split each type into approved and pending
		const timeEntries = timeEntriesResult.data || [];
		const materials = materialsResult.data || [];
		const expenses = expensesResult.data || [];
		const mileage = mileageResult.data || [];
		const ata = ataResult.data || [];

		const timeSplit = splitByStatus(timeEntries);
		const materialsSplit = splitByStatus(materials);
		const expensesSplit = splitByStatus(expenses);
		const mileageSplit = splitByStatus(mileage);
		const ataSplit = splitByStatus(ata);

		// DEBUG: logga vad vi faktiskt får från databasen för att felsöka saknade rader
		console.log('[invoice/basis] debug', {
			projectIds,
			from,
			to,
			time: {
				total: timeEntries.length,
				pending: timeSplit.pending.length,
				approved: timeSplit.approved.length,
			},
			material: {
				total: materials.length,
				pending: materialsSplit.pending.length,
				approved: materialsSplit.approved.length,
			},
			expense: {
				total: expenses.length,
				pending: expensesSplit.pending.length,
				approved: expensesSplit.approved.length,
			},
			mileage: {
				total: mileage.length,
				pending: mileageSplit.pending.length,
				approved: mileageSplit.approved.length,
			},
			ata: {
				total: ata.length,
				pending: ataSplit.pending.length,
				approved: ataSplit.approved.length,
				ids: ata.map((a: any) => ({
					id: a.id,
					status: a.status,
					created_at: a.created_at,
					project_id: a.project_id,
				})),
			},
		});

		return NextResponse.json({
			approved: {
				time: timeSplit.approved,
				material: materialsSplit.approved,
				expense: expensesSplit.approved,
				mileage: mileageSplit.approved,
				ata: ataSplit.approved,
			},
			pending: {
				time: timeSplit.pending,
				material: materialsSplit.pending,
				expense: expensesSplit.pending,
				mileage: mileageSplit.pending,
				ata: ataSplit.pending,
			},
		});
	} catch (error) {
		console.error('Invoice basis API error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

