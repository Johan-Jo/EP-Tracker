import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { fixedTimeBlockSchema } from '@/lib/schemas/fixed-time-block';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const projectId = request.nextUrl.searchParams.get('projectId');

		if (!projectId) {
			return NextResponse.json({ error: 'projectId krävs' }, { status: 400 });
		}

		const supabase = await createClient();

		// Ensure project belongs to the same org
		const { data: project } = await supabase
			.from('projects')
			.select('id')
			.eq('id', projectId)
			.eq('org_id', membership.org_id)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Projekt saknas eller åtkomst nekad' }, { status: 404 });
		}

		const { data: blocks, error } = await supabase
			.from('fixed_time_blocks')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('project_id', projectId)
			.order('created_at', { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ blocks: blocks ?? [] }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/fixed-time-blocks:', error);
		return NextResponse.json({ error: 'Internt serverfel' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Endast admin eller arbetsledare kan skapa fasta poster' }, { status: 403 });
		}

		const body = await request.json();
		const parseResult = fixedTimeBlockSchema.safeParse(body);

		if (!parseResult.success) {
			return NextResponse.json(
				{ error: 'Valideringsfel', details: parseResult.error.flatten() },
				{ status: 400 },
			);
		}

		const payload = parseResult.data;
		const supabase = await createClient();

		// Verify project belongs to org
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('id', payload.project_id)
			.eq('org_id', membership.org_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Projekt saknas eller åtkomst nekad' }, { status: 404 });
		}

		const { data: block, error } = await supabase
			.from('fixed_time_blocks')
			.insert({
				org_id: membership.org_id,
				project_id: payload.project_id,
				name: payload.name,
				description: payload.description,
				amount_sek: payload.amount_sek,
				vat_pct: payload.vat_pct ?? 25,
				article_no: payload.article_no,
				account_no: payload.account_no,
				period_start: payload.period_start,
				period_end: payload.period_end,
				created_by: user.id,
			})
			.select('*')
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ block }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/fixed-time-blocks:', error);
		return NextResponse.json({ error: 'Internt serverfel' }, { status: 500 });
	}
}


