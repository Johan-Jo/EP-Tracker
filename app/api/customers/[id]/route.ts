import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import {
	buildCustomerUpdate,
	parseCustomerPayload,
} from '@/lib/services/customer-mapper';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

export async function GET(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const { params } = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const includeRelations = request.nextUrl.searchParams.get('withRelations') === 'true';

		const selectClause = includeRelations
			? '*, relation_stats:customer_merge_relations(project_count, contact_count, invoice_basis_count)'
			: '*';

		const { data, error } = await supabase
			.from('customers')
			.select(selectClause)
			.eq('org_id', membership.org_id)
			.eq('id', params.id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
			}
			console.error('Failed to fetch customer', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (includeRelations) {
			const { relation_stats, ...rest } = data as any;
			const statsRecord = Array.isArray(relation_stats) ? relation_stats[0] : relation_stats;
			const relations = statsRecord
				? {
						project_count: Number(statsRecord.project_count ?? 0),
						contact_count: Number(statsRecord.contact_count ?? 0),
						invoice_basis_count: Number(statsRecord.invoice_basis_count ?? 0),
				  }
				: { project_count: 0, contact_count: 0, invoice_basis_count: 0 };

			return NextResponse.json({ customer: rest, relations }, { status: 200 });
		}

		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		console.error('GET /api/customers/:id failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const { params } = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const json = await request.json();
		const payload = parseCustomerPayload(json);
		const updatePayload = buildCustomerUpdate({
			payload,
			userId: user.id,
		});

		if (payload.customer_no) {
			updatePayload.customer_no = payload.customer_no;
		}

		const supabase = await createClient();
		const { data, error } = await supabase
			.from('customers')
			.update(updatePayload)
			.eq('org_id', membership.org_id)
			.eq('id', params.id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
			}
			if (error.code === '23505') {
				return NextResponse.json(
					{ error: 'Kundnummer används redan, försök ett annat.' },
					{ status: 409 }
				);
			}
			console.error('Failed to update customer', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data, { status: 200 });
	} catch (error) {
		if (error instanceof Error) {
			const knownMessages = new Set([
				'Ogiltigt organisationsnummer',
				'Organisationsnummer krävs för företagskund',
				'Ogiltigt personnummer',
				'Personnummer krävs för privatkund',
			]);
			if (knownMessages.has(error.message)) {
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
		}

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Ogiltig indata', details: error.flatten() },
				{ status: 422 }
			);
		}

		console.error('PUT /api/customers/:id failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


