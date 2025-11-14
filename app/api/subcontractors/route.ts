import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	parseSubcontractorPayload,
	buildSubcontractorInsert,
} from '@/lib/services/subcontractor-mapper';
import { z } from 'zod';

const escLike = (value: string) => value.replace(/[%_]/g, (char) => `\\${char}`).trim();

export async function GET(request: NextRequest) {
	try {
		const { membership } = await getSession();
		if (!membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const params = request.nextUrl.searchParams;
		const queryParam = params.get('query') ?? '';
		const includeArchived = params.get('includeArchived') === 'true';

		const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10));
		const pageSize = Math.min(
			100,
			Math.max(1, Number.parseInt(params.get('pageSize') ?? '25', 10))
		);
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		let dbQuery = supabase
			.from('subcontractors')
			.select(
				'id, subcontractor_no, company_name, org_no, vat_no, f_tax, contact_person_name, contact_person_phone, email, phone_mobile, phone_work, invoice_email, invoice_method, peppol_id, gln, terms, default_vat_rate, hourly_rate_sek, bankgiro, plusgiro, reference, user_id, is_archived, created_at, updated_at',
				{ count: 'exact' }
			)
			.eq('org_id', membership.org_id)
			.range(from, to)
			.order('subcontractor_no', { ascending: true });

		// Filter archived
		if (!includeArchived) {
			dbQuery = dbQuery.eq('is_archived', false);
		}

		// Search by company name, subcontractor number, org_no, or email
		if (queryParam) {
			const query = escLike(queryParam);
			dbQuery = dbQuery.or(
				`company_name.ilike.%${query}%,subcontractor_no.ilike.%${query}%,org_no.ilike.%${query}%,email.ilike.%${query}%`
			);
		}

		const { data, error, count } = await dbQuery;

		if (error) {
			console.error('[API] Error fetching subcontractors:', error);
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
		console.error('[API] Unexpected error in GET /api/subcontractors:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check permissions - only admin and foreman can create subcontractors
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan skapa underentreprenörer' },
				{ status: 403 }
			);
		}

		const body = await request.json().catch(() => null);
		if (!body) {
			return NextResponse.json(
				{ error: 'Request body måste vara JSON' },
				{ status: 400 }
			);
		}

		// Validate payload
		let payload;
		try {
			payload = parseSubcontractorPayload(body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const zodError = error as z.ZodError;
				console.error('[API] Validation error:', zodError.errors);
				return NextResponse.json(
					{
						error: 'Invalid input',
						details: zodError.errors,
					},
					{ status: 422 }
				);
			}
			throw error;
		}

		const supabase = await createClient();

		// Check for duplicate subcontractor number
		if (payload.subcontractor_no) {
			const { data: existing } = await supabase
				.from('subcontractors')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('subcontractor_no', payload.subcontractor_no)
				.single();

			if (existing) {
				return NextResponse.json(
					{ error: `Underentreprenörsnummer ${payload.subcontractor_no} finns redan` },
					{ status: 409 }
				);
			}
		}

		// Check for duplicate org_no
		const { data: existingOrg } = await supabase
			.from('subcontractors')
			.select('id')
			.eq('org_id', membership.org_id)
			.eq('org_no', payload.org_no)
			.single();

		if (existingOrg) {
			return NextResponse.json(
				{ error: 'Organisationsnummer finns redan i registret' },
				{ status: 409 }
			);
		}

		// Check for duplicate user_id (one subcontractor per user per org)
		if (payload.user_id) {
			const { data: existingUser } = await supabase
				.from('subcontractors')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('user_id', payload.user_id)
				.single();

			if (existingUser) {
				return NextResponse.json(
					{ error: 'Denna användare är redan kopplad till en annan underentreprenör' },
					{ status: 409 }
				);
			}
		}

		// Build insert payload
		const insertData = buildSubcontractorInsert({
			payload,
			orgId: membership.org_id,
			userId: user.id,
		});

		// Insert subcontractor
		const { data: newSubcontractor, error: insertError } = await supabase
			.from('subcontractors')
			.insert(insertData)
			.select()
			.single();

		if (insertError) {
			console.error('[API] Error creating subcontractor:', insertError);

			// Handle duplicate key errors
			if (insertError.code === '23505') {
				if (insertError.message.includes('subcontractor_no')) {
					return NextResponse.json(
						{ error: `Underentreprenörsnummer ${insertData.subcontractor_no} finns redan` },
						{ status: 409 }
					);
				}
				if (insertError.message.includes('org_no')) {
					return NextResponse.json(
						{ error: 'Organisationsnummer finns redan i registret' },
						{ status: 409 }
					);
				}
				if (insertError.message.includes('user_id')) {
					return NextResponse.json(
						{ error: 'Denna användare är redan kopplad till en annan underentreprenör' },
						{ status: 409 }
					);
				}
			}

			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json(newSubcontractor, { status: 201 });
	} catch (error) {
		console.error('[API] Unexpected error in POST /api/subcontractors:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

