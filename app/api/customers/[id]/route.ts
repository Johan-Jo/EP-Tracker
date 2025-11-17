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
		const params = await resolveRouteParams(context);

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
		const params = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const json = await request.json();
		console.log('[API] Received customer update payload:', JSON.stringify(json, null, 2));
		let payload;
		try {
			payload = parseCustomerPayload(json);
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error('[API] Validation error details:', error.flatten());
				return NextResponse.json(
					{ 
						error: 'Ogiltig indata', 
						details: error.flatten(),
						issues: error.issues.map(issue => ({
							path: issue.path.join('.'),
							message: issue.message,
						}))
					},
					{ status: 422 }
				);
			}
			throw error;
		}
		const updatePayload = buildCustomerUpdate({
			payload,
			userId: user.id,
		});

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

export async function DELETE(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can delete customers
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast admin och ekonomi kan radera kunder' },
				{ status: 403 }
			);
		}

		const supabase = await createClient();

		// Check if customer exists and belongs to the organization
		const { data: customer, error: fetchError } = await supabase
			.from('customers')
			.select('id, customer_no, company_name, first_name, last_name')
			.eq('org_id', membership.org_id)
			.eq('id', params.id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				return NextResponse.json({ error: 'Kund hittades inte' }, { status: 404 });
			}
			console.error('Failed to fetch customer', fetchError);
			return NextResponse.json({ error: fetchError.message }, { status: 500 });
		}

		// Check for related records (projects, invoice_basis, etc.)
		// Note: Foreign keys might prevent deletion, but we check to provide better error messages
		const { data: projects } = await supabase
			.from('projects')
			.select('id')
			.eq('org_id', membership.org_id)
			.contains('customer_ids', [params.id])
			.limit(1);

		if (projects && projects.length > 0) {
			return NextResponse.json(
				{
					error: 'Kan inte radera kund som är kopplad till projekt. Ta bort projektförbindelserna först.',
				},
				{ status: 409 }
			);
		}

		// Delete customer
		const { error: deleteError } = await supabase
			.from('customers')
			.delete()
			.eq('org_id', membership.org_id)
			.eq('id', params.id);

		if (deleteError) {
			// Check for foreign key constraint violations
			if (deleteError.code === '23503') {
				return NextResponse.json(
					{
						error: 'Kan inte radera kund som är kopplad till projekt, fakturaunderlag eller andra poster.',
					},
					{ status: 409 }
				);
			}
			console.error('Failed to delete customer', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		const customerName =
			customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

		return NextResponse.json(
			{ message: `Kund "${customerName}" raderad` },
			{ status: 200 }
		);
	} catch (error) {
		console.error('DELETE /api/customers/:id failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


