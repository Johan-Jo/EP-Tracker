import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createExpenseSchema } from '@/lib/schemas/expense';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

// GET /api/expenses - List expenses with filters
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function GET(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		const searchParams = request.nextUrl.searchParams;
		const project_id = searchParams.get('project_id');
		const user_id = searchParams.get('user_id');
		const status = searchParams.get('status');
		const category = searchParams.get('category');
		const limit = parseInt(searchParams.get('limit') || '100');

		let query = supabase
			.from('expenses')
			.select(`
				*,
				project:projects(id, name, project_number),
				user:profiles!expenses_user_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (project_id) query = query.eq('project_id', project_id);
		if (user_id) query = query.eq('user_id', user_id);
		if (status) query = query.eq('status', status);
		if (category) query = query.eq('category', category);

		// Workers only see their own expenses; admin/foreman/finance see all
		if (membership.role === 'worker') {
			query = query.eq('user_id', user.id);
		}

		const { data: expenses, error } = await query;

		if (error) {
			console.error('Error fetching expenses:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ expenses }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/expenses:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/expenses - Create new expense
// EPIC 26: Optimized from 3 queries to 1 query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const validation = createExpenseSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// EPIC 26: Skip project verification - RLS will handle it (saves 1 query)
		const supabase = await createClient();

		// EPIC 26: Insert expense without JOINs for maximum speed
		const { data: expense, error: insertError } = await supabase
			.from('expenses')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				project_id: data.project_id,
				category: data.category,
				description: data.description,
				amount_sek: data.amount_sek,
				vat: data.vat,
				photo_urls: data.photo_urls,
				notes: data.notes,
				status: 'draft',
			})
			.select('*')
			.single();

		if (insertError) {
			console.error('Error creating expense:', insertError);
			if (insertError.code === '23503') {
				return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
			}
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ expense }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/expenses:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

