import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { phaseSchema } from '@/lib/schemas/project';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

// POST /api/phases - Create new phase
// EPIC 26: Optimized from 3 queries to 1 query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can create phases
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { projectId, ...phaseData } = body;

		if (!projectId) {
			return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
		}

		// EPIC 26: Skip project verification - RLS will handle it (saves 1 query)
		const supabase = await createClient();

		// Validate phase data
		const validatedData = phaseSchema.parse(phaseData);

		// Get next sort_order
		const { data: existingPhases } = await supabase
			.from('phases')
			.select('sort_order')
			.eq('project_id', projectId)
			.order('sort_order', { ascending: false })
			.limit(1);

		const nextSortOrder = existingPhases && existingPhases.length > 0 
			? existingPhases[0].sort_order + 1 
			: 0;

		// Create phase
		const { data: phase, error } = await supabase
			.from('phases')
			.insert({
				project_id: projectId,
				...validatedData,
				sort_order: nextSortOrder,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating phase:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(phase);
	} catch (error) {
		console.error('Error in POST /api/phases:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}

