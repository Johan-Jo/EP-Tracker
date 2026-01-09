import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json(
			{ error: 'Endast administratörer och arbetsledare kan granska material' },
			{ status: 403 }
		);
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const periodStart = searchParams.get('period_start');
	const periodEnd = searchParams.get('period_end');
	const status = searchParams.get('status') || 'submitted';

	if (!periodStart || !periodEnd) {
		return NextResponse.json(
			{ error: 'period_start och period_end krävs' },
			{ status: 400 }
		);
	}

	// ✅ PERFORMANCE: Select specific columns instead of *
	let query = supabase
		.from('materials')
		.select(`
			id,
			org_id,
			project_id,
			user_id,
			description,
			qty,
			unit,
			unit_price_sek,
			total_sek,
			status,
			ata_id,
			notes,
			created_at,
			updated_at,
			user:profiles!materials_user_id_fkey(id, full_name, email),
			project:projects(name, project_number)
		`)
		.eq('org_id', membership.org_id)
		.gte('created_at', periodStart)
		.lte('created_at', periodEnd);

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	const { data, error } = await query.order('created_at', { ascending: false });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Ensure user data is always present with fallback to email
	const materialsWithUserData = (data || []).map((material: any) => {
		if (!material.user || !material.user.full_name) {
			return {
				...material,
				user: {
					...material.user,
					full_name: material.user?.email || `Användare ${material.user_id?.substring(0, 8) || 'Okänd'}`,
					email: material.user?.email || null,
				},
			};
		}
		return material;
	});

	return NextResponse.json({ materials: materialsWithUserData });
}

