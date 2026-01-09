import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json(
			{ error: 'Endast administratörer och arbetsledare kan granska utlägg' },
			{ status: 403 }
		);
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const periodStart = searchParams.get('period_start');
	const periodEnd = searchParams.get('period_end');
	const status = searchParams.get('status') || 'submitted';

	if (!periodStart || !periodEnd) {
		return NextResponse.json(
			{ error: 'period_start och period_end krävs' },
			{ status: 400 }
		);
	}

	// ✅ PERFORMANCE: Select specific columns instead of *
	let query = supabase
		.from('expenses')
		.select(`
			id,
			org_id,
			project_id,
			user_id,
			description,
			amount_sek,
			category,
			status,
			ata_id,
			date,
			receipt_url,
			created_at,
			updated_at,
			user:profiles!expenses_user_id_fkey(id, full_name, email),
			project:projects(name, project_number)
		`)
		.eq('org_id', membership.org_id)
		.gte('date', periodStart)
		.lte('date', periodEnd);

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	const { data, error } = await query.order('date', { ascending: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Ensure user data is always present with fallback to email
	const expensesWithUserData = (data || []).map((expense: any) => {
		if (!expense.user || !expense.user.full_name) {
			return {
				...expense,
				user: {
					...expense.user,
					full_name: expense.user?.email || `Användare ${expense.user_id?.substring(0, 8) || 'Okänd'}`,
					email: expense.user?.email || null,
				},
			};
		}
		return expense;
	});

	return NextResponse.json({ expenses: expensesWithUserData });
}

