import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import {
	buildSubcontractorUpdate,
	parseSubcontractorPayload,
} from '@/lib/services/subcontractor-mapper';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

export async function GET(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);
		const subcontractorId = params.id;

		if (!subcontractorId) {
			return NextResponse.json(
				{ error: 'Subcontractor ID is required' },
				{ status: 400 }
			);
		}

		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		const { data: subcontractor, error } = await supabase
			.from('subcontractors')
			.select('*, profiles:user_id(id, full_name, email)')
			.eq('org_id', membership.org_id)
			.eq('id', subcontractorId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return NextResponse.json(
					{ error: 'Underentreprenör hittades inte' },
					{ status: 404 }
				);
			}
			console.error('Failed to fetch subcontractor', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(subcontractor, { status: 200 });
	} catch (error) {
		console.error('GET /api/subcontractors/:id failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const params = await resolveRouteParams(context);
		const subcontractorId = params.id;

		if (!subcontractorId) {
			return NextResponse.json(
				{ error: 'Subcontractor ID is required' },
				{ status: 400 }
			);
		}

		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check permissions - only admin and foreman can update subcontractors
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan uppdatera underentreprenörer' },
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
				console.error('[API] Validation error:', zodError.issues);
				return NextResponse.json(
					{
						error: 'Invalid input',
						details: zodError.issues,
					},
					{ status: 422 }
				);
			}
			throw error;
		}

		const supabase = await createClient();

		// Check if subcontractor exists and belongs to organization
		const { data: existingSubcontractor, error: fetchError } = await supabase
			.from('subcontractors')
			.select('*')
			.eq('id', subcontractorId)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingSubcontractor) {
			return NextResponse.json(
				{ error: 'Underentreprenör hittades inte' },
				{ status: 404 }
			);
		}

		// Check for duplicate subcontractor number if changed
		if (
			payload.subcontractor_no &&
			payload.subcontractor_no !== existingSubcontractor.subcontractor_no
		) {
			const { data: duplicate } = await supabase
				.from('subcontractors')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('subcontractor_no', payload.subcontractor_no)
				.neq('id', subcontractorId)
				.single();

			if (duplicate) {
				return NextResponse.json(
					{ error: `Underentreprenörsnummer ${payload.subcontractor_no} finns redan` },
					{ status: 409 }
				);
			}
		}

		// Check for duplicate org_no if changed
		if (payload.org_no && payload.org_no !== existingSubcontractor.org_no) {
			const { data: duplicateOrg } = await supabase
				.from('subcontractors')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('org_no', payload.org_no)
				.neq('id', subcontractorId)
				.single();

			if (duplicateOrg) {
				return NextResponse.json(
					{ error: 'Organisationsnummer finns redan i registret' },
					{ status: 409 }
				);
			}
		}

		// Check for duplicate user_id if changed (one subcontractor per user per org)
		if (payload.user_id && payload.user_id !== existingSubcontractor.user_id) {
			const { data: duplicateUser } = await supabase
				.from('subcontractors')
				.select('id')
				.eq('org_id', membership.org_id)
				.eq('user_id', payload.user_id)
				.neq('id', subcontractorId)
				.single();

			if (duplicateUser) {
				return NextResponse.json(
					{ error: 'Denna användare är redan kopplad till en annan underentreprenör' },
					{ status: 409 }
				);
			}
		}

		// Build update payload
		const updateData = buildSubcontractorUpdate({
			payload,
			userId: user.id,
		});

		const { data: updatedSubcontractor, error: updateError } = await supabase
			.from('subcontractors')
			.update(updateData)
			.eq('org_id', membership.org_id)
			.eq('id', subcontractorId)
			.select('*, profiles:user_id(id, full_name, email)')
			.single();

		if (updateError) {
			console.error('[API] Error updating subcontractor:', updateError);

			// Handle duplicate key errors
			if (updateError.code === '23505') {
				if (updateError.message.includes('subcontractor_no')) {
					return NextResponse.json(
						{ error: `Underentreprenörsnummer ${payload.subcontractor_no} finns redan` },
						{ status: 409 }
					);
				}
				if (updateError.message.includes('org_no')) {
					return NextResponse.json(
						{ error: 'Organisationsnummer finns redan i registret' },
						{ status: 409 }
					);
				}
				if (updateError.message.includes('user_id')) {
					return NextResponse.json(
						{ error: 'Denna användare är redan kopplad till en annan underentreprenör' },
						{ status: 409 }
					);
				}
			}

			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json(updatedSubcontractor, { status: 200 });
	} catch (error) {
		console.error('PUT /api/subcontractors/:id failed', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

