import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMileageSchema } from '@/lib/schemas/mileage';

// GET /api/mileage - List mileage with filters
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
		const start_date = searchParams.get('start_date');
		const end_date = searchParams.get('end_date');
		const limit = parseInt(searchParams.get('limit') || '100');

		let query = supabase
			.from('mileage')
			.select(`
				*,
				project:projects(id, name, project_number),
				user:profiles(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('date', { ascending: false })
			.limit(limit);

		if (project_id) query = query.eq('project_id', project_id);
		if (user_id) query = query.eq('user_id', user_id);
		if (status) query = query.eq('status', status);
		if (start_date) query = query.gte('date', start_date);
		if (end_date) query = query.lte('date', end_date);

		if (membership.role === 'worker') {
			query = query.eq('user_id', user.id);
		}

		const { data: mileage, error } = await query;

		if (error) {
			console.error('Error fetching mileage:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ mileage }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/mileage:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/mileage - Create new mileage
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
		const validation = createMileageSchema.safeParse(body);

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

		const { data: mileage, error: insertError } = await supabase
			.from('mileage')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				project_id: data.project_id,
				date: data.date,
				km: data.km,
				rate_per_km_sek: data.rate_per_km_sek,
				from_location: data.from_location,
				to_location: data.to_location,
				notes: data.notes,
				status: 'draft',
			})
			.select(`
				*,
				project:projects(id, name, project_number)
			`)
			.single();

		if (insertError) {
			console.error('Error creating mileage:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ mileage }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/mileage:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

