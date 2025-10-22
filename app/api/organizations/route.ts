import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { name } = body;

		if (!name || !name.trim()) {
			return NextResponse.json({ error: 'Organisationsnamn krävs' }, { status: 400 });
		}

		// Get user's organization membership
		const { data: membership, error: membershipError } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (membershipError || !membership) {
			return NextResponse.json({ error: 'Ingen organisation hittades' }, { status: 400 });
		}

		// Only admin can update organization
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Endast administratörer kan uppdatera organisationen' }, { status: 403 });
		}

		// Update organization
		const { data, error } = await supabase
			.from('organizations')
			.update({
				name: name.trim(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', membership.org_id)
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json({ organization: data }, { status: 200 });
	} catch (error: any) {
		console.error('Error updating organization:', error);

		let errorMessage = 'Kunde inte uppdatera organisation';

		if (error?.message) {
			errorMessage = error.message;
		}

		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

