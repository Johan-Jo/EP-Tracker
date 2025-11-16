import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		// Admin, arbetsledare och ekonomi kan använda fakturaunderlag
		if (!['admin', 'foreman', 'finance'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Du har inte behörighet att läsa fakturaunderlag' },
				{ status: 403 }
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('projectId');

		if (!projectId) {
			return NextResponse.json({ error: 'projectId krävs' }, { status: 400 });
		}

		const supabase = await createClient();

		// Ta med alla relevanta rader oavsett om de är klara för fakturering eller inte.
		// Vi exkluderar endast 'rejected'.
		const statuses = ['draft', 'submitted', 'approved'];

		type Row = { date: string | null };

		async function getMinMaxDate(
			table: string,
			column: string
		): Promise<{ min: string | null; max: string | null }> {
			// Supabase query builder saknar .clone(), så vi gör två separata queries
			const [minRes, maxRes] = await Promise.all([
				supabase
					.from(table)
					.select<string, Row>(`${column}, id, status`)
					.eq('org_id', membership.org_id)
					.eq('project_id', projectId)
					.in('status', statuses)
					.order(column, { ascending: true })
					.limit(1),
				supabase
					.from(table)
					.select<string, Row>(`${column}, id, status`)
					.eq('org_id', membership.org_id)
					.eq('project_id', projectId)
					.in('status', statuses)
					.order(column, { ascending: false })
					.limit(1),
			]);

			const minRow = (minRes.data && (minRes.data as Row[])[0]) || null;
			const maxRow = (maxRes.data && (maxRes.data as Row[])[0]) || null;
			const min = (minRow && (minRow as any)[column]) as string | null;
			const max = (maxRow && (maxRow as any)[column]) as string | null;

			console.log('[invoice/project-date-range] min/max', {
				table,
				column,
				projectId,
				min,
				max,
				minRow,
				maxRow,
			});

			return { min, max };
		}

		const [timeRange, materialsRange, expensesRange, mileageRange, ataRange] = await Promise.all([
			getMinMaxDate('time_entries', 'start_at'),
			getMinMaxDate('materials', 'created_at'),
			getMinMaxDate('expenses', 'created_at'),
			getMinMaxDate('mileage', 'date'),
			getMinMaxDate('ata', 'created_at'),
		]);

		const allMins = [timeRange.min, materialsRange.min, expensesRange.min, mileageRange.min, ataRange.min].filter(
			Boolean
		) as string[];
		const allMaxs = [timeRange.max, materialsRange.max, expensesRange.max, mileageRange.max, ataRange.max].filter(
			Boolean
		) as string[];

		console.log('[invoice/project-date-range] collected ranges', {
			projectId,
			timeRange,
			materialsRange,
			expensesRange,
			mileageRange,
			ataRange,
		});

		if (!allMins.length || !allMaxs.length) {
			// Inga relevanta rader – låt frontend behålla sina datum
			return NextResponse.json({ hasData: false });
		}

		const minDate = allMins.reduce((min, current) =>
			new Date(current) < new Date(min) ? current : min
		);
		const maxDate = allMaxs.reduce((max, current) =>
			new Date(current) > new Date(max) ? current : max
		);

		// Skicka tillbaka YYYY-MM-DD
		const from = minDate.split('T')[0];
		const to = maxDate.split('T')[0];

		return NextResponse.json({
			hasData: true,
			from,
			to,
		});
	} catch (error) {
		console.error('Error in /api/invoice/project-date-range:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod vid hämtning av datumintervall' },
			{ status: 500 }
		);
	}
}


