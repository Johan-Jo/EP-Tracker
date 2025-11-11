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

	return NextResponse.json({ ata: data });
}

