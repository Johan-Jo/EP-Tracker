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
		const [timeEntries, materials, expenses, mileageEntries] = await Promise.all([
			// Time entries (employees only for salary)
			supabase
				.from('time_entries')
				.select(`
					*,
					user:profiles!time_entries_user_id_fkey(full_name, email),
					project:projects(name, project_number),
					phase:phases(name),
					employee:employees!time_entries_employee_id_fkey(id, employee_no, hourly_rate_sek, salary_per_hour)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.not('employee_id', 'is', null) // Only include employee time entries
				.gte('start_at', startDate)
				.lte('start_at', endDate)
				.order('start_at', { ascending: true }),

			// Materials
			supabase
				.from('materials')
				.select(`
					*,
					user:profiles!materials_user_id_fkey(full_name, email),
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
					user:profiles!expenses_user_id_fkey(full_name, email),
					project:projects(name, project_number)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('expense_date', startDate)
				.lte('expense_date', endDate),

			// Mileage
			supabase
				.from('mileage')
				.select(`
					*,
					user:profiles!mileage_user_id_fkey(full_name, email),
					project:projects(name, project_number)
				`)
				.eq('org_id', membership.org_id)
				.eq('status', 'approved')
				.gte('trip_date', startDate)
				.lte('trip_date', endDate),
		]);

		// Calculate summary
		const totalTimeEntries = timeEntries.data?.length || 0;
		const totalMaterials = materials.data?.length || 0;
		const totalExpenses = expenses.data?.length || 0;
		const totalMileage = mileageEntries.data?.length || 0;

		// Calculate total amount
		let totalAmount = 0;

		// Sum time entries (would need hourly rate, using 0 for now)
		// In reality, you'd need to fetch hourly rates from profiles or memberships

		// Sum materials
		materials.data?.forEach((m) => {
			totalAmount += m.total_sek || 0;
		});

		// Sum expenses
		expenses.data?.forEach((e) => {
			totalAmount += e.amount_sek || 0;
		});

		// Sum mileage
		mileageEntries.data?.forEach((m) => {
			totalAmount += m.total_sek || 0;
		});

		// Generate preview rows (first 20)
		const headers = [
			'Datum',
			'Anställd',
			'Email',
			'Projekt',
			'Projektnummer',
			'Fas',
			'Typ',
			'Beskrivning',
			'Timmar',
			'Belopp (SEK)',
			'Kommentar',
		];

		const previewRows: string[][] = [];
		let rowCount = 0;
		const maxRows = 20;

		// Add time entries
		if (timeEntries.data) {
			for (const entry of timeEntries.data) {
				if (rowCount >= maxRows) break;
				const hours = entry.duration_min ? (entry.duration_min / 60).toFixed(2) : '0';
				previewRows.push([
					new Date(entry.start_at).toLocaleDateString('sv-SE'),
					entry.user?.full_name || '',
					entry.user?.email || '',
					entry.project?.name || '',
					entry.project?.project_number || '',
					entry.phase?.name || '',
					'Tid',
					entry.task_label || '',
					hours,
					'',
					entry.notes || '',
				]);
				rowCount++;
			}
		}

		// Add materials
		if (materials.data) {
			for (const material of materials.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(material.created_at).toLocaleDateString('sv-SE'),
					material.user?.full_name || '',
					material.user?.email || '',
					material.project?.name || '',
					material.project?.project_number || '',
					material.phase?.name || '',
					'Material',
					`${material.description} (${material.qty} ${material.unit})`,
					'',
					material.total_sek?.toString() || '0',
					material.notes || '',
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
					expense.user?.full_name || '',
					expense.user?.email || '',
					expense.project?.name || '',
					expense.project?.project_number || '',
					'',
					'Utlägg',
					expense.description,
					'',
					expense.amount_sek?.toString() || '0',
					expense.category || '',
				]);
				rowCount++;
			}
		}

		// Add mileage
		if (mileageEntries.data) {
			for (const mileage of mileageEntries.data) {
				if (rowCount >= maxRows) break;
				previewRows.push([
					new Date(mileage.trip_date).toLocaleDateString('sv-SE'),
					mileage.user?.full_name || '',
					mileage.user?.email || '',
					mileage.project?.name || '',
					mileage.project?.project_number || '',
					'',
					'Milersättning',
					`${mileage.from_location || ''} → ${mileage.to_location || ''} (${mileage.km} km)`,
					'',
					mileage.total_sek?.toString() || '0',
					mileage.notes || '',
				]);
				rowCount++;
			}
		}

		return NextResponse.json({
			summary: {
				totalTimeEntries,
				totalMaterials,
				totalExpenses,
				totalMileage,
				totalAmount: Math.round(totalAmount),
			},
			headers,
			preview: previewRows,
		});
	} catch (error) {
		console.error('Error generating salary preview:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

