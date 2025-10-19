import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMaterialSchema } from '@/lib/schemas/material';

// GET /api/materials - List materials with filters
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const project_id = searchParams.get('project_id');
		const user_id = searchParams.get('user_id');
		const status = searchParams.get('status');
		const limit = parseInt(searchParams.get('limit') || '100');

		// Build query
		let query = supabase
			.from('materials')
			.select(`
				*,
				project:projects(id, name, project_number),
				phase:phases(id, name),
				user:profiles!materials_user_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.limit(limit);

		// Apply filters
		if (project_id) query = query.eq('project_id', project_id);
		if (user_id) query = query.eq('user_id', user_id);
		if (status) query = query.eq('status', status);

		// Workers only see their own materials; admin/foreman/finance see all
		if (membership.role === 'worker') {
			query = query.eq('user_id', user.id);
		}

		const { data: materials, error } = await query;

		if (error) {
			console.error('Error fetching materials:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ materials }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/materials:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/materials - Create new material
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = createMaterialSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Verify project belongs to user's organization
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('id', data.project_id)
			.eq('org_id', membership.org_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
		}

		// Insert material
		const { data: material, error: insertError } = await supabase
			.from('materials')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				project_id: data.project_id,
				phase_id: data.phase_id,
				description: data.description,
				qty: data.qty,
				unit: data.unit,
				unit_price_sek: data.unit_price_sek,
				photo_urls: data.photo_urls,
				notes: data.notes,
				status: 'draft',
			})
			.select(`
				*,
				project:projects(id, name, project_number),
				phase:phases(id, name)
			`)
			.single();

		if (insertError) {
			console.error('Error creating material:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ material }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/materials:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

