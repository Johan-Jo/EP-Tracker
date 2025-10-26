import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMaterialSchema } from '@/lib/schemas/material';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

// GET /api/materials - List materials with filters
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function GET(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

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
// EPIC 26: Optimized from 3 queries to 1 query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

		// EPIC 26: Skip project verification - RLS will handle it (saves 1 query)
		const supabase = await createClient();

		// EPIC 26: Insert material without JOINs for maximum speed
		// Client already has project/phase data cached
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
			.select('*')
			.single();

		if (insertError) {
			console.error('Error creating material:', insertError);
			if (insertError.code === '23503') {
				return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
			}
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ material }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/materials:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

