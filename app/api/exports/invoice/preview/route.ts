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
		const [timeEntries, diaryEntries, materials, expenses, atas] = await Promise.all([
			// Time entries with user info
			supabase
				.from('time_entries')
				.select(`
					*,
					project:projects(name, project_number),
					phase:phases(name),
					user:profiles!time_entries_user_id_fkey(full_name)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('start_at', startDate)
				.lte('start_at', endDate)
				.order('start_at', { ascending: true }),

			// Diary entries for linking
			supabase
				.from('diary_entries')
				.select('project_id, date, work_performed')
				.eq('org_id', membership.org_id)
				.gte('date', startDate)
				.lte('date', endDate),

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
			'Tid',
			'Person',
			'Dagbok',
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

		// Create a map of diary entries by project_id and date for quick lookup
		const diaryMap = new Map<string, string>();
		diaryEntries.data?.forEach((diary) => {
			const key = `${diary.project_id}_${diary.date}`;
			diaryMap.set(key, diary.work_performed || '');
		});

		// Add individual time entries with date, time, person, and diary on the same row
		if (timeEntries.data) {
			for (const entry of timeEntries.data) {
				if (rowCount >= maxRows) break;
				
				// Extract date from start_at (use local date to avoid timezone issues)
				const entryDate = new Date(entry.start_at);
				// Format as YYYY-MM-DD using local date (not UTC)
				const year = entryDate.getFullYear();
				const month = String(entryDate.getMonth() + 1).padStart(2, '0');
				const day = String(entryDate.getDate()).padStart(2, '0');
				const dateStr = `${year}-${month}-${day}`;
				const formattedDate = entryDate.toLocaleDateString('sv-SE');
				
				// Format time range
				const startTime = entryDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
				const stopTime = entry.stop_at 
					? new Date(entry.stop_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
					: '';
				const timeStr = stopTime ? `${startTime}-${stopTime}` : startTime;
				
				// Get diary entry for this project and date
				const diaryKey = `${entry.project_id}_${dateStr}`;
				const diaryText = diaryMap.get(diaryKey) || '';
				
				// Get person name
				const personName = entry.user?.full_name || '';
				
				// Calculate hours
				const hours = entry.duration_min ? (entry.duration_min / 60).toFixed(2) : '0';

				previewRows.push([
					formattedDate,                    // Datum
					timeStr,                          // Tid
					personName,                       // Person
					diaryText,                        // Dagbok
					entry.project?.name || '',        // Projekt
					entry.project?.project_number || '', // Projektnummer
					entry.phase?.name || '',          // Fas/ÄTA-nummer
					'Tidblock',                       // Typ
					entry.task_label || entry.notes || '', // Beskrivning
					hours,                            // Antal (timmar)
					'h',                              // Enhet
					'',                               // À-pris (SEK)
					'',                               // Totalt (SEK)
				]);
				rowCount++;
			}
		}

		// Add materials (separate section)
		if (materials.data) {
			for (const material of materials.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(material.created_at).toLocaleDateString('sv-SE'), // Datum
					'',                                                          // Tid (empty for materials)
					'',                                                          // Person (empty for materials)
					'',                                                          // Dagbok (empty for materials)
					material.project?.name || '',                                // Projekt
					material.project?.project_number || '',                      // Projektnummer
					material.phase?.name || '',                                  // Fas/ÄTA-nummer
					'Material',                                                  // Typ
					material.description,                                        // Beskrivning
					material.qty?.toString() || '0',                            // Antal
					material.unit || '',                                         // Enhet
					material.unit_price_sek?.toString() || '0',                 // À-pris (SEK)
					material.total_sek?.toString() || '0',                      // Totalt (SEK)
				]);
				rowCount++;
			}
		}

		// Add expenses (separate section)
		if (expenses.data) {
			for (const expense of expenses.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(expense.expense_date).toLocaleDateString('sv-SE'), // Datum
					'',                                                          // Tid (empty for expenses)
					'',                                                          // Person (empty for expenses)
					'',                                                          // Dagbok (empty for expenses)
					expense.project?.name || '',                                 // Projekt
					expense.project?.project_number || '',                       // Projektnummer
					'',                                                          // Fas/ÄTA-nummer
					'Utlägg',                                                    // Typ
					expense.description,                                         // Beskrivning
					'1',                                                         // Antal
					'st',                                                        // Enhet
					expense.amount_sek?.toString() || '0',                      // À-pris (SEK)
					expense.amount_sek?.toString() || '0',                      // Totalt (SEK)
				]);
				rowCount++;
			}
		}

		// Add ÄTA
		if (atas.data) {
			for (const ata of atas.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(ata.created_at).toLocaleDateString('sv-SE'), // Datum
					'',                                                      // Tid (empty for ÄTA)
					'',                                                      // Person (empty for ÄTA)
					'',                                                      // Dagbok (empty for ÄTA)
					ata.project?.name || '',                                 // Projekt
					ata.project?.project_number || '',                       // Projektnummer
					`ÄTA ${ata.ata_number}`,                                 // Fas/ÄTA-nummer
					'ÄTA',                                                   // Typ
					ata.description,                                         // Beskrivning
					'1',                                                     // Antal
					'st',                                                    // Enhet
					ata.amount_sek?.toString() || '0',                      // À-pris (SEK)
					ata.amount_sek?.toString() || '0',                      // Totalt (SEK)
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

