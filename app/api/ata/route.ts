import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { ataInputSchema } from '@/lib/schemas/ata';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const projectId = searchParams.get('project_id');
	const statusFilter = searchParams.get('status');

	let query = supabase
		.from('ata')
		.select(`
			*,
			project:projects(name, project_number),
			created_by_profile:profiles!ata_created_by_fkey(full_name),
			approved_by_profile:profiles!ata_approved_by_fkey(full_name)
		`)
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false });

	if (projectId) {
		query = query.eq('project_id', projectId);
	}

	if (statusFilter && statusFilter !== 'all') {
		query = query.eq('status', statusFilter);
	} else {
		// Default: exclude rejected entries
		query = query.not('status', 'eq', 'rejected');
	}

	const { data, error } = await query;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ata: data });
}

export async function POST(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = await createClient();
	const rawBody = await request.json();

	const parsed = ataInputSchema.safeParse(rawBody);

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: 'Validation error',
				details: parsed.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const body = parsed.data;
	const fixedAmount = body.billing_type === 'FAST' ? body.fixed_amount_sek ?? null : null;
	const materialIds = Array.from(new Set(body.material_ids ?? [])).filter(Boolean);
	let materialsAmount = 0;

	if (materialIds.length > 0) {
		const { data: materialRows, error: materialsFetchError } = await supabase
			.from('materials')
			.select('id, org_id, project_id, total_sek')
			.in('id', materialIds);

		if (materialsFetchError) {
			return NextResponse.json({ error: materialsFetchError.message }, { status: 500 });
		}

		if (!materialRows || materialRows.length !== materialIds.length) {
			return NextResponse.json(
				{
					error: 'Alla materialposter kunde inte hittas',
				},
				{ status: 400 },
			);
		}

		const invalidOrg = materialRows.find((row) => row.org_id !== membership.org_id);
		if (invalidOrg) {
			return NextResponse.json(
				{
					error: 'Material tillhör en annan organisation',
				},
				{ status: 403 },
			);
		}

		const invalidProject = materialRows.find((row) => row.project_id !== body.project_id);
		if (invalidProject) {
			return NextResponse.json(
				{
					error: 'Materialet tillhör ett annat projekt',
				},
				{ status: 400 },
			);
		}

		materialsAmount = materialRows.reduce((sum, row) => {
			const amount = Number(row.total_sek ?? 0);
			return sum + (Number.isFinite(amount) ? amount : 0);
		}, 0);
		materialsAmount = Math.round(materialsAmount * 100) / 100;
	}

	const signedAt =
		body.signed_at instanceof Date
			? body.signed_at.toISOString()
			: body.signed_at
			? new Date(body.signed_at).toISOString()
			: null;

	const { data, error } = await supabase
		.from('ata')
		.insert({
			project_id: body.project_id,
			title: body.title,
			description: body.description ?? null,
			qty: body.qty ?? null,
			unit: body.unit ?? null,
			unit_price_sek: body.unit_price_sek ?? null,
			ata_number: body.ata_number ?? null,
			status: body.status,
			billing_type: body.billing_type,
			fixed_amount_sek: fixedAmount,
			materials_amount_sek: materialsAmount,
			signed_by_name: body.signed_by_name ?? null,
			signed_at: signedAt,
			org_id: membership.org_id,
			created_by: user.id,
		})
		.select()
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	if (materialIds.length > 0) {
		const { error: updateMaterialsError } = await supabase
			.from('materials')
			.update({ ata_id: data.id })
			.in('id', materialIds);

		if (updateMaterialsError) {
			// Attempt to clean up created ÄTA if linking fails
			await supabase.from('ata').delete().eq('id', data.id);
			return NextResponse.json({ error: 'Kunde inte koppla material till ÄTA' }, { status: 500 });
		}
	}

	return NextResponse.json({ ata: data });
}

