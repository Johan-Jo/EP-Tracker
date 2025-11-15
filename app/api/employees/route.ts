import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	parseEmployeePayload,
	buildEmployeeInsert,
} from '@/lib/services/employee-mapper';
import { z } from 'zod';

export async function GET(request: NextRequest) {
	try {
		const { membership } = await getSession();
		if (!membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const { searchParams } = new URL(request.url);

		const page = Number.parseInt(searchParams.get('page') || '1', 10);
		const pageSize = Number.parseInt(searchParams.get('pageSize') || '25', 10);
		const query = searchParams.get('query') || '';
		const includeArchived = searchParams.get('includeArchived') === 'true';

		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		let dbQuery = supabase
			.from('employees')
			.select(
				'id, employee_no, first_name, last_name, personal_identity_no, email, phone_mobile, phone_work, employment_type, hourly_rate_sek, employment_start_date, employment_end_date, user_id, is_archived, created_at, updated_at',
				{ count: 'exact' }
			)
			.eq('org_id', membership.org_id)
			.range(from, to)
			.order('employee_no', { ascending: true });

		// Filter archived
		if (!includeArchived) {
			dbQuery = dbQuery.eq('is_archived', false);
		}

		// Search by name, employee number, or email
		if (query) {
			dbQuery = dbQuery.or(
				`first_name.ilike.%${query}%,last_name.ilike.%${query}%,employee_no.ilike.%${query}%,email.ilike.%${query}%`
			);
		}

		const { data, error, count } = await dbQuery;

		if (error) {
			console.error('[API] Error fetching employees:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({
			items: data || [],
			page,
			pageSize,
			total: count || 0,
		});
	} catch (error) {
		console.error('[API] Unexpected error in GET /api/employees:', error);
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

		// Check permissions - only admin and foreman can create employees
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan skapa personal' },
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

		console.log('[API] Received employee payload:', body);

		// Validate payload
		let payload;
		try {
			payload = parseEmployeePayload(body);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const zodError = error as z.ZodError;
				console.error('[API] Validation error:', zodError.issues);
				return NextResponse.json(
					{
						error: 'Invalid input: expected string, received undefined',
						details: zodError.issues,
					},
					{ status: 422 }
				);
			}
			throw error;
		}

		const supabase = await createClient();

		// Check for duplicate employee number
		if (payload.employee_no) {
			const { data: existing } = await supabase
				.from('employees')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('employee_no', payload.employee_no)
				.single();

			if (existing) {
				return NextResponse.json(
					{ error: `Personalnummer ${payload.employee_no} finns redan` },
					{ status: 409 }
				);
			}
		}

		// Check for duplicate user_id (one employee per user per org)
		if (payload.user_id) {
			const { data: existingUser } = await supabase
				.from('employees')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('user_id', payload.user_id)
				.single();

			if (existingUser) {
				return NextResponse.json(
					{ error: 'Denna användare är redan kopplad till en annan personal' },
					{ status: 409 }
				);
			}
		}

		// Build insert payload
		const insertData = buildEmployeeInsert({
			payload,
			orgId: membership.org_id,
			userId: user.id,
		});

		// Insert employee
		const { data: newEmployee, error: insertError } = await supabase
			.from('employees')
			.insert(insertData)
			.select()
			.single();

		if (insertError) {
			console.error('[API] Error creating employee:', insertError);
			
			// Handle duplicate key errors
			if (insertError.code === '23505') {
				if (insertError.message.includes('employee_no')) {
					return NextResponse.json(
						{ error: `Personalnummer ${insertData.employee_no} finns redan` },
						{ status: 409 }
					);
				}
				if (insertError.message.includes('personal_identity_no')) {
					return NextResponse.json(
						{ error: 'Personnummer finns redan i registret' },
						{ status: 409 }
					);
				}
				if (insertError.message.includes('email')) {
					return NextResponse.json(
						{ error: 'E-postadress finns redan i registret' },
						{ status: 409 }
					);
				}
				if (insertError.message.includes('user_id')) {
					return NextResponse.json(
						{ error: 'Denna användare är redan kopplad till en annan personal' },
						{ status: 409 }
					);
				}
			}

			return NextResponse.json(
				{ error: insertError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json(newEmployee, { status: 201 });
	} catch (error) {
		console.error('[API] Unexpected error in POST /api/employees:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

