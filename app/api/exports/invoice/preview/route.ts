import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can preview exports
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const startDate = searchParams.get('start');
		const endDate = searchParams.get('end');

		if (!startDate || !endDate) {
			return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
		}

		const supabase = await createClient();

		// Fetch all approved items for the period
		const [timeEntries, materials, expenses, atas] = await Promise.all([
			// Time entries
			supabase
				.from('time_entries')
				.select(`
					*,
					project:projects(name, project_number),
					phase:phases(name)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('start_at', startDate)
				.lte('start_at', endDate)
				.order('project_id', { ascending: true }),

			// Materials
			supabase
				.from('materials')
				.select(`
					*,
					project:projects(name, project_number),
					phase:phases(name)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('created_at', startDate)
				.lte('created_at', endDate),

			// Expenses
			supabase
				.from('expenses')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('expense_date', startDate)
				.lte('expense_date', endDate),

			// ÄTA
			supabase
				.from('ata')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('created_at', startDate)
				.lte('created_at', endDate),
		]);

		// Calculate summary
		const totalTimeEntries = timeEntries.data?.length || 0;
		const totalMaterials = materials.data?.length || 0;
		const totalExpenses = expenses.data?.length || 0;
		const totalAtas = atas.data?.length || 0;

		// Calculate total amount
		let totalAmount = 0;

		// Sum materials
		materials.data?.forEach((m) => {
			totalAmount += m.total_sek || 0;
		});

		// Sum expenses
		expenses.data?.forEach((e) => {
			totalAmount += e.amount_sek || 0;
		});

		// Sum ATAs
		atas.data?.forEach((a) => {
			totalAmount += a.amount_sek || 0;
		});

		// Generate preview rows (first 20)
		const headers = [
			'Datum',
			'Projekt',
			'Projektnummer',
			'Fas/ÄTA-nummer',
			'Typ',
			'Beskrivning',
			'Antal',
			'Enhet',
			'À-pris (SEK)',
			'Totalt (SEK)',
		];

		const previewRows: string[][] = [];
		let rowCount = 0;
		const maxRows = 20;

		// Group time entries by project and phase
		const timeEntriesByProject = new Map<string, { project: any; phase: any; hours: number }>();
		timeEntries.data?.forEach((entry) => {
			const key = `${entry.project_id}_${entry.phase_id || 'no-phase'}`;
			const existing = timeEntriesByProject.get(key);
			const hours = entry.duration_min ? entry.duration_min / 60 : 0;

			if (existing) {
				existing.hours += hours;
			} else {
				timeEntriesByProject.set(key, {
					project: entry.project,
					phase: entry.phase,
					hours,
				});
			}
		});

		// Add grouped time entries
		for (const [_, group] of timeEntriesByProject) {
			if (rowCount >= maxRows) break;
			previewRows.push([
				'',
				group.project?.name || '',
				group.project?.project_number || '',
				group.phase?.name || '',
				'Arbetstid',
				'Arbetstid',
				group.hours.toFixed(2),
				'timmar',
				'',
				'',
			]);
			rowCount++;
		}

		// Add materials
		if (materials.data) {
			for (const material of materials.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(material.created_at).toLocaleDateString('sv-SE'),
					material.project?.name || '',
					material.project?.project_number || '',
					material.phase?.name || '',
					'Material',
					material.description,
					material.qty?.toString() || '0',
					material.unit || '',
					material.unit_price_sek?.toString() || '0',
					material.total_sek?.toString() || '0',
				]);
				rowCount++;
			}
		}

		// Add expenses
		if (expenses.data) {
			for (const expense of expenses.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(expense.expense_date).toLocaleDateString('sv-SE'),
					expense.project?.name || '',
					expense.project?.project_number || '',
					'',
					'Utlägg',
					expense.description,
					'1',
					'st',
					expense.amount_sek?.toString() || '0',
					expense.amount_sek?.toString() || '0',
				]);
				rowCount++;
			}
		}

		// Add ÄTA
		if (atas.data) {
			for (const ata of atas.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(ata.created_at).toLocaleDateString('sv-SE'),
					ata.project?.name || '',
					ata.project?.project_number || '',
					`ÄTA ${ata.ata_number}`,
					'ÄTA',
					ata.description,
					'1',
					'st',
					ata.amount_sek?.toString() || '0',
					ata.amount_sek?.toString() || '0',
				]);
				rowCount++;
			}
		}

		return NextResponse.json({
			summary: {
				totalTimeEntries,
				totalMaterials,
				totalExpenses,
				totalMileage: totalAtas, // Using totalAtas for invoice
				totalAmount: Math.round(totalAmount),
			},
			headers,
			preview: previewRows,
		});
	} catch (error) {
		console.error('Error generating invoice preview:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

