import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { customerTypeEnum } from '@/lib/schemas/customer';
import {
	buildCustomerInsert,
	parseCustomerPayload,
} from '@/lib/services/customer-mapper';

const escLike = (value: string) =>
	value.replace(/[%_]/g, (char) => `\\${char}`).trim();

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const params = request.nextUrl.searchParams;
		const queryParam = params.get('query') ?? '';
		const typeParam = params.get('type');
		const includeArchived = params.get('includeArchived') === 'true';

		const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10));
		const pageSize = Math.min(
			100,
			Math.max(1, Number.parseInt(params.get('pageSize') ?? '25', 10))
		);
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		let query = supabase
			.from('customers')
			.select(
				'id, customer_no, type, company_name, first_name, last_name, org_no, personal_identity_no, invoice_email, phone_mobile, is_archived, created_at, updated_at',
				{ count: 'exact' }
			)
			.eq('org_id', membership.org_id)
			.range(from, to)
			.order('company_name', { ascending: true })
			.order('last_name', { ascending: true })
			.order('first_name', { ascending: true });

		if (!includeArchived) {
			query = query.eq('is_archived', false);
		}

		if (typeParam) {
			const parsedType = typeParam.toUpperCase();
			if (customerTypeEnum.safeParse(parsedType).success) {
				query = query.eq('type', parsedType);
			}
		}

		const trimmedQuery = queryParam.trim();
		if (trimmedQuery.length > 0) {
			const escaped = escLike(trimmedQuery);
			const digits = trimmedQuery.replace(/\D/g, '');
			const filters = [
				`customer_no.ilike.%${escaped}%`,
				`company_name.ilike.%${escaped}%`,
				`first_name.ilike.%${escaped}%`,
				`last_name.ilike.%${escaped}%`,
				`invoice_email.ilike.%${escaped}%`,
				`phone_mobile.ilike.%${escaped}%`,
			];

			if (digits.length >= 3) {
				filters.push(`org_no.ilike.%${digits}%`);
				filters.push(`personal_identity_no.ilike.%${digits}%`);
			}

			query = query.or(filters.join(','), { foreignTable: undefined });
		}

		const { data, error, count } = await query;

		if (error) {
			console.error('Failed to fetch customers', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{
				items: data ?? [],
				page,
				pageSize,
				total: count ?? 0,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('GET /api/customers failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const json = await request.json();
		
		// Log the incoming data for debugging
		console.log('[API] Received customer payload:', JSON.stringify(json, null, 2));
		
		let payload;
		try {
			payload = parseCustomerPayload(json);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const zodError = error as z.ZodError;
				console.error('[API] Validation error:', zodError.errors);
				return NextResponse.json(
					{ 
						error: 'Invalid input: expected string, received undefined',
						details: zodError.errors.map(e => ({
							path: e.path.join('.'),
							message: e.message,
							received: e.code === 'invalid_type' ? e.received : undefined
						}))
					},
					{ status: 422 }
				);
			}
			throw error;
		}
		const insertPayload = buildCustomerInsert({
			payload,
			orgId: membership.org_id,
			userId: user.id,
		});

		const supabase = await createClient();
		const { data, error } = await supabase
			.from('customers')
			.insert(insertPayload)
			.select()
			.single();

		if (error) {
			if (error.code === '23505') {
				return NextResponse.json(
					{ error: 'Kundnummer används redan, försök ett annat.' },
					{ status: 409 }
				);
			}

			console.error('Failed to create customer', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data, { status: 201 });
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

		console.error('POST /api/customers failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}


