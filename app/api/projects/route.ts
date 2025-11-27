import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { z } from 'zod';

// Schema for creating a project
const projectSchema = z.object({
	name: z.string().min(1, 'Projektnamn krävs'),
	customer_id: z.string().uuid().nullable().optional(),
	status: z.enum(['active', 'paused', 'completed', 'archived']).default('active'),
	project_hourly_rate_sek: z.number().positive().nullable().optional(),
	billing_mode: z.enum(['LOPANDE_ONLY', 'FAST_ONLY', 'BOTH']).optional(),
	default_time_billing_type: z.enum(['LOPANDE', 'FAST']).optional(),
});

// GET /api/projects - List projects with filters
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const searchParams = request.nextUrl.searchParams;
		const customer_id = searchParams.get('customer_id');
		const status = searchParams.get('status');

		// Build query
		let query = supabase
			.from('projects')
			.select('id, name, project_number, customer_id, status, created_at, site_address')
			.eq('org_id', membership.org_id)
			.order('name');

		// Apply filters
		if (customer_id) query = query.eq('customer_id', customer_id);
		if (status) query = query.eq('status', status);

		const { data: projects, error } = await query;

		if (error) {
			console.error('Error fetching projects:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ projects: projects || [] });
	} catch (error) {
		console.error('Error in GET /api/projects:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check permissions (admin/foreman only)
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		const body = await request.json();

		// Validate request body
		const validation = projectSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: 'Validation error',
					details: validation.error.format(),
				},
				{ status: 400 }
			);
		}

		const validated = validation.data;

		// Use admin client to bypass RLS (we've already verified permissions above)
		const adminClient = createAdminClient();

		// Prepare project data
		const projectData = {
			org_id: membership.org_id,
			name: validated.name,
			customer_id: validated.customer_id || null,
			status: validated.status || 'active',
			billing_mode: validated.billing_mode || 'LOPANDE_ONLY',
			default_time_billing_type: validated.default_time_billing_type || 'LOPANDE',
			project_hourly_rate_sek: validated.project_hourly_rate_sek || null,
		};

		// Create project
		const { data: project, error: projectError } = await adminClient
			.from('projects')
			.insert(projectData)
			.select('id, name, project_number, customer_id, status, created_at')
			.single();

		if (projectError) {
			console.error('Error creating project:', projectError);
			return NextResponse.json(
				{
					error: projectError.message,
					code: projectError.code,
					details: projectError.details,
					hint: projectError.hint,
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({ project }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/projects:', error);
		
		// Ensure we always return JSON, even for unexpected errors
		if (error instanceof Error) {
			if (error.name === 'ZodError') {
				return NextResponse.json(
					{ error: 'Invalid input', details: (error as any).issues },
					{ status: 400 }
				);
			}
			return NextResponse.json(
				{
					error: error.message || 'Internal server error',
					name: error.name,
				},
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}






