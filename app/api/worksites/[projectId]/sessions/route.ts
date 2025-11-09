import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const paramsSchema = z.object({
	projectId: z.string().uuid(),
});

const querySchema = z.object({
    // Accept either full ISO datetimes or simple dates (yyyy-MM-dd)
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(2000).optional(),
});

type RouteParams = { projectId: string };

export async function GET(req: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const t0 = Date.now();
		const resolvedParams = await resolveRouteParams(context);
		if (!resolvedParams.projectId) {
			return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
		}
		const parseParams = paramsSchema.safeParse(resolvedParams);
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

        // Normalize date-only inputs to full ISO range in UTC
        const normalizeFrom = (v?: string) => {
            if (!v) return undefined;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                return new Date(v + 'T00:00:00.000Z').toISOString();
            }
            return v;
        };
        const normalizeTo = (v?: string) => {
            if (!v) return undefined;
            if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                return new Date(v + 'T23:59:59.999Z').toISOString();
            }
            return v;
        };

        const fromISO = normalizeFrom(from);
        const toISO = normalizeTo(to);

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

		// EPIC 32: Use attendance_session as source
		let query = supabase
			.from('attendance_session')
			.select('id, person_id, project_id, check_in_ts, check_out_ts, corrected, immutable_hash, profiles:person_id(full_name), projects:project_id(name)')
			.eq('project_id', resolvedParams.projectId)
			.eq('org_id', membership.org_id)
			.order('check_in_ts', { ascending: true })
			.limit(limit);

        if (fromISO) query = query.gte('check_in_ts', fromISO);
        if (toISO) query = query.lte('check_in_ts', toISO);

		const { data: entries, error } = await query;
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// Map to a minimal session-like structure
		const sessions = (entries || []).map(e => ({
			id: (e as any).id,
			person_id: (e as any).person_id,
			project_id: (e as any).project_id,
			check_in_ts: (e as any).check_in_ts,
			check_out_ts: (e as any).check_out_ts,
			name: (e as any).profiles?.full_name ?? null,
			project_name: (e as any).projects?.name ?? null,
			source_first: 'session',
			source_last: 'session',
			corrected: (e as any).corrected ?? false,
			immutable_hash: (e as any).immutable_hash,
		}));

		const duration = Date.now() - t0;
		return new NextResponse(
			JSON.stringify({ sessions, count: sessions.length, duration_ms: duration }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-Perf-ms': String(duration) },
			}
		);
	} catch (e) {
		console.error('GET /api/worksites/[projectId]/sessions error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
