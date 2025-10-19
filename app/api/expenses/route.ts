import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createExpenseSchema } from '@/lib/schemas/expense';

// GET /api/expenses - List expenses with filters
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

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
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
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

		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('id', data.project_id)
			.eq('org_id', membership.org_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
		}

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
			.select(`
				*,
				project:projects(id, name, project_number)
			`)
			.single();

		if (insertError) {
			console.error('Error creating expense:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ expense }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/expenses:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

