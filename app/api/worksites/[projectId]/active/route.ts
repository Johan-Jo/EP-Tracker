import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const paramsSchema = z.object({
	projectId: z.string().uuid(),
});

type RouteParams = { projectId: string };

export async function GET(_req: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const resolvedParams = await resolveRouteParams(context);
		if (!resolvedParams.projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}
		const parse = paramsSchema.safeParse(resolvedParams);
		if (!parse.success) {
			return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's org via membership (RLS still enforced)
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		const { data: project, error } = await supabase
			.from('projects')
			.select('id, org_id, name, worksite_enabled, worksite_code, address_line1, address_line2, postal_code, city, country, building_id, timezone, retention_years')
			.eq('id', resolvedParams.projectId)
			.eq('org_id', membership.org_id)
			.single();

		if (error || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		return NextResponse.json({
			project,
			active: !!project.worksite_enabled,
		});
	} catch (e) {
		console.error('GET /api/worksites/[projectId]/active error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
