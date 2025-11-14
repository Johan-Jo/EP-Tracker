import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	parseEmployeePayload,
	buildEmployeeUpdate,
	employeeToPayload,
} from '@/lib/services/employee-mapper';
import { type Employee } from '@/lib/schemas/employee';
import { z } from 'zod';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

export async function GET(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);
		const employeeId = params.id;

		if (!employeeId) {
			return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
		}

		const { membership } = await getSession();
		if (!membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const { data: employee, error } = await supabase
			.from('employees')
			.select('*, profiles:user_id(id, full_name, email)')
			.eq('id', employeeId)
			.eq('org_id', membership.org_id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Personal hittades inte' }, { status: 404 });
			}
			console.error('[API] Error fetching employee:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(employee);
	} catch (error) {
		console.error('[API] Unexpected error in GET /api/employees/[id]:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);
		const employeeId = params.id;

		if (!employeeId) {
			return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
		}

		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check permissions - only admin and foreman can update employees
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan uppdatera personal' },
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
			payload = parseEmployeePayload(body);
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

		// Check if employee exists and belongs to organization
		const { data: existingEmployee, error: fetchError } = await supabase
			.from('employees')
			.select('*, profiles:user_id(id, full_name, email)')
			.eq('id', employeeId)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingEmployee) {
			return NextResponse.json(
				{ error: 'Personal hittades inte' },
				{ status: 404 }
			);
		}

		// Check for duplicate employee number if changed
		if (payload.employee_no && payload.employee_no !== existingEmployee.employee_no) {
			const { data: duplicate } = await supabase
				.from('employees')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('employee_no', payload.employee_no)
				.neq('id', employeeId)
				.single();

			if (duplicate) {
				return NextResponse.json(
					{ error: `Personalnummer ${payload.employee_no} finns redan` },
					{ status: 409 }
				);
			}
		}

		// Check for duplicate user_id if changed (one employee per user per org)
		if (payload.user_id && payload.user_id !== existingEmployee.user_id) {
			const { data: duplicateUser } = await supabase
				.from('employees')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('user_id', payload.user_id)
				.neq('id', employeeId)
				.single();

			if (duplicateUser) {
				return NextResponse.json(
					{ error: 'Denna användare är redan kopplad till en annan personal' },
					{ status: 409 }
				);
			}
		}

		// Build update payload
		const updateData = buildEmployeeUpdate({
			payload,
			userId: user.id,
		});

		// Update employee
		const { data: updatedEmployee, error: updateError } = await supabase
			.from('employees')
			.update(updateData)
			.eq('id', employeeId)
			.eq('org_id', membership.org_id)
			.select()
			.single();

		if (updateError) {
			console.error('[API] Error updating employee:', updateError);
			
			// Handle duplicate key errors
			if (updateError.code === '23505') {
				if (updateError.message.includes('employee_no')) {
					return NextResponse.json(
						{ error: `Personalnummer ${payload.employee_no} finns redan` },
						{ status: 409 }
					);
				}
				if (updateError.message.includes('personal_identity_no')) {
					return NextResponse.json(
						{ error: 'Personnummer finns redan i registret' },
						{ status: 409 }
					);
				}
				if (updateError.message.includes('email')) {
					return NextResponse.json(
						{ error: 'E-postadress finns redan i registret' },
						{ status: 409 }
					);
				}
				if (updateError.message.includes('user_id')) {
					return NextResponse.json(
						{ error: 'Denna användare är redan kopplad till en annan personal' },
						{ status: 409 }
					);
				}
			}

			return NextResponse.json(
				{ error: updateError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json(updatedEmployee);
	} catch (error) {
		console.error('[API] Unexpected error in PUT /api/employees/[id]:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

