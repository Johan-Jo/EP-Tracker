import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { fixedTimeBlockUpdateSchema } from '@/lib/schemas/fixed-time-block';

interface RouteParams {
	params: Promise<{ id: string }>;
}

async function ensureAccess(
	blockId: string,
	supabase: Awaited<ReturnType<typeof createClient>>,
	orgId: string,
) {
	const { data: block, error } = await supabase
		.from('fixed_time_blocks')
		.select('id, org_id, project_id')
		.eq('id', blockId)
		.single();

	if (error || !block || block.org_id !== orgId) {
		return null;
	}

	return block;
}

export async function PATCH(request: NextRequest, props: RouteParams) {
	try {
		const params = await props.params;
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Endast admin eller arbetsledare kan uppdatera fasta poster' }, { status: 403 });
		}

		const supabase = await createClient();
		const block = await ensureAccess(params.id, supabase, membership.org_id);

		if (!block) {
			return NextResponse.json({ error: 'Fast post saknas eller åtkomst nekad' }, { status: 404 });
		}

		const body = await request.json();
		const parseResult = fixedTimeBlockUpdateSchema.safeParse(body);

		if (!parseResult.success) {
			return NextResponse.json(
				{ error: 'Valideringsfel', details: parseResult.error.flatten() },
				{ status: 400 },
			);
		}

		const { project_id, ...updates } = parseResult.data;

		const { data: updated, error } = await supabase
			.from('fixed_time_blocks')
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq('id', params.id)
			.select('*')
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ block: updated }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/fixed-time-blocks/[id]:', error);
		return NextResponse.json({ error: 'Internt serverfel' }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, props: RouteParams) {
	try {
		const params = await props.params;
		const { membership } = await getSession();

		if (!membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Endast admin eller arbetsledare kan ta bort fasta poster' }, { status: 403 });
		}

		const supabase = await createClient();
		const block = await ensureAccess(params.id, supabase, membership.org_id);

		if (!block) {
			return NextResponse.json({ error: 'Fast post saknas eller åtkomst nekad' }, { status: 404 });
		}

		const { count, error: usageError } = await supabase
			.from('time_entries')
			.select('id', { count: 'exact', head: true })
			.eq('fixed_block_id', params.id);

		if (usageError) {
			return NextResponse.json({ error: usageError.message }, { status: 500 });
		}

		if ((count ?? 0) > 0) {
			return NextResponse.json(
				{ error: 'Kan inte ta bort en fast post som används av tidsregistreringar' },
				{ status: 409 },
			);
		}

		const { error } = await supabase.from('fixed_time_blocks').delete().eq('id', params.id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/fixed-time-blocks/[id]:', error);
		return NextResponse.json({ error: 'Internt serverfel' }, { status: 500 });
	}
}

