import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { customerContactSchema } from '@/lib/schemas/customer';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

export async function GET(_: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const { data, error } = await supabase
			.from('customer_contacts')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('customer_id', params.id)
			.order('is_primary', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Failed to list customer contacts', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data ?? [], { status: 200 });
	} catch (error) {
		console.error('GET /api/customers/:id/contacts failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const json = await request.json();
		const payload = customerContactSchema.parse(json);

		const supabase = await createClient();
		const { data, error } = await supabase
			.from('customer_contacts')
			.insert({
				org_id: membership.org_id,
				customer_id: params.id,
				name: payload.name,
				role: payload.role ?? null,
				email: payload.email ?? null,
				phone: payload.phone ?? null,
				reference_code: payload.reference_code ?? null,
				is_primary: payload.is_primary ?? false,
				created_by: user.id,
				updated_by: user.id,
			})
			.select()
			.single();

		if (error) {
			if (error.code === '23503') {
				return NextResponse.json(
					{ error: 'Kunden hittades inte eller tillhör annan organisation.' },
					{ status: 404 }
				);
			}
			console.error('Failed to create customer contact', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (payload.is_primary && data) {
			const { error: demoteError } = await supabase
				.from('customer_contacts')
				.update({ is_primary: false })
				.eq('org_id', membership.org_id)
				.eq('customer_id', params.id)
				.neq('id', data.id);

			if (demoteError) {
				console.warn('Failed to demote previous primary contact', demoteError);
			}
		}

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Ogiltig indata', details: error.flatten() },
				{ status: 422 }
			);
		}

		console.error('POST /api/customers/:id/contacts failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


