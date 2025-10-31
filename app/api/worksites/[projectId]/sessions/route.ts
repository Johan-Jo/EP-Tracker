import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const paramsSchema = z.object({
	projectId: z.string().uuid(),
});

const querySchema = z.object({
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(2000).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
	try {
		const parseParams = paramsSchema.safeParse(params);
		if (!parseParams.success) {
			return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
		}

		const url = new URL(req.url);
		const qs = Object.fromEntries(url.searchParams.entries());
		const parseQuery = querySchema.safeParse(qs);
		if (!parseQuery.success) {
			return NextResponse.json({ error: 'Invalid query params', details: parseQuery.error.format() }, { status: 400 });
		}

		const { from, to, limit = 1000 } = parseQuery.data;

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

		// For M1 we derive sessions from time_entries (until attendance_session exists)
		let query = supabase
			.from('time_entries')
			.select('id, user_id, project_id, start_at, stop_at, status, profiles(full_name), projects(name)')
			.eq('project_id', params.projectId)
			.eq('org_id', membership.org_id)
			.order('start_at', { ascending: true })
			.limit(limit);

		if (from) query = query.gte('start_at', from);
		if (to) query = query.lte('start_at', to);

		const { data: entries, error } = await query;
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Map to a minimal session-like structure
		const sessions = (entries || []).map(e => ({
			id: e.id,
			person_id: e.user_id,
			project_id: e.project_id,
			check_in_ts: e.start_at,
			check_out_ts: e.stop_at,
			name: (e as any).profiles?.full_name ?? null,
			project_name: (e as any).projects?.name ?? null,
			source_first: 'time_entry',
			source_last: 'time_entry',
			corrected: false,
		}));

		return NextResponse.json({ sessions });
	} catch (e) {
		console.error('GET /api/worksites/[projectId]/sessions error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
