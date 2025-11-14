import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
	customerPayloadSchema,
	type Customer,
} from '@/lib/schemas/customer';
import {
	customerToPayload,
	prepareCustomerFields,
} from '@/lib/services/customer-mapper';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const mergeRequestSchema = z.object({
	duplicateId: z.string().uuid(),
	overrides: customerPayloadSchema.partial().optional(),
});

const MERGEABLE_FIELDS: Array<keyof ReturnType<typeof prepareCustomerFields>> = [
	'type',
	'company_name',
	'org_no',
	'vat_no',
	'f_tax',
	'first_name',
	'last_name',
	'personal_identity_no',
	'rot_enabled',
	'property_designation',
	'housing_assoc_org_no',
	'apartment_no',
	'ownership_share',
	'rot_consent_at',
	'invoice_email',
	'invoice_method',
	'peppol_id',
	'gln',
	'terms',
	'default_vat_rate',
	'bankgiro',
	'plusgiro',
	'reference',
	'invoice_address_street',
	'invoice_address_zip',
	'invoice_address_city',
	'invoice_address_country',
	'delivery_address_street',
	'delivery_address_zip',
	'delivery_address_city',
	'delivery_address_country',
	'phone_mobile',
	'notes',
	'is_archived',
];

function sanitizeMergedPayload(target: Customer, overrides?: z.infer<typeof mergeRequestSchema>['overrides']) {
	const basePayload = customerToPayload(target);
	const mergedPayloadInput = {
		...basePayload,
		...(overrides ?? {}),
		type: overrides?.type ?? basePayload.type,
		customer_no: overrides?.customer_no ?? basePayload.customer_no,
	};

	const parsedPayload = customerPayloadSchema.parse(mergedPayloadInput);
	const prepared = prepareCustomerFields(parsedPayload);

	const allowedUpdate: Record<string, unknown> = {};
	for (const field of MERGEABLE_FIELDS) {
		if (field in prepared) {
			allowedUpdate[field] = (prepared as any)[field];
		}
	}

	return {
		updateData: allowedUpdate,
		customerNo: parsedPayload.customer_no ?? target.customer_no,
		type: parsedPayload.type,
	};
}

type RouteParams = { id: string };

export async function POST(request: NextRequest, context: RouteContext<RouteParams>) {
	try {
		const { params } = await resolveRouteParams(context);
		const targetId = params.id;
		if (!targetId) {
			return NextResponse.json({ error: 'Target customer id is required' }, { status: 400 });
		}

		const { user, membership } = await getSession();
		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Endast administratörer kan slå ihop kunder' }, { status: 403 });
		}

		const body = await request.json().catch(() => null);
		if (!body) {
			return NextResponse.json({ error: 'Request body måste vara JSON' }, { status: 400 });
		}

		const { duplicateId, overrides } = mergeRequestSchema.parse(body);

		if (duplicateId === targetId) {
			return NextResponse.json({ error: 'Välj en annan kund att slå ihop med' }, { status: 400 });
		}

		const supabase = await createClient();
		const [{ data: target, error: targetError }, { data: duplicate, error: duplicateError }] = await Promise.all([
			supabase
				.from('customers')
				.select('*')
				.eq('org_id', membership.org_id)
				.eq('id', targetId)
				.single(),
			supabase
				.from('customers')
				.select('*')
				.eq('org_id', membership.org_id)
				.eq('id', duplicateId)
				.single(),
		]);

		if (targetError || !target) {
			return NextResponse.json({ error: 'Kunde inte hitta mål-kunden' }, { status: 404 });
		}

		if (duplicateError || !duplicate) {
			return NextResponse.json({ error: 'Kunde inte hitta dubbletten att slå ihop' }, { status: 404 });
		}

		const { updateData, customerNo, type } = sanitizeMergedPayload(target as Customer, overrides);

		const adminClient = createAdminClient();
		const nowIso = new Date().toISOString();

		const projectUpdate = await adminClient
			.from('projects')
			.update({ customer_id: targetId, updated_at: nowIso })
			.eq('org_id', membership.org_id)
			.eq('customer_id', duplicateId);

		const contactUpdate = await adminClient
			.from('customer_contacts')
			.update({ customer_id: targetId, updated_at: nowIso })
			.eq('org_id', membership.org_id)
			.eq('customer_id', duplicateId);

		const invoiceLockedUpdate = await adminClient
			.from('invoice_basis')
			.update({ customer_id: targetId })
			.eq('org_id', membership.org_id)
			.eq('customer_id', duplicateId)
			.eq('locked', true);

		const invoiceUnlockedUpdate = await adminClient
			.from('invoice_basis')
			.update({ customer_id: targetId, customer_snapshot: null })
			.eq('org_id', membership.org_id)
			.eq('customer_id', duplicateId)
			.eq('locked', false);

		const relatedError = [projectUpdate, contactUpdate, invoiceLockedUpdate, invoiceUnlockedUpdate].find(
			(result) => result.error
		);
		if (relatedError && relatedError.error) {
			return NextResponse.json({ error: relatedError.error.message }, { status: 500 });
		}

		const { data: updatedCustomer, error: updateError } = await supabase
			.from('customers')
			.update({
				...updateData,
				type,
				customer_no: customerNo,
				updated_by: user.id,
			})
			.eq('id', targetId)
			.eq('org_id', membership.org_id)
			.select()
			.single();

		if (updateError || !updatedCustomer) {
			return NextResponse.json({ error: updateError?.message ?? 'Kunde inte uppdatera mål-kunden' }, { status: 500 });
		}

		const archiveNote = duplicate.notes
			? `${duplicate.notes}\n\n[MERGED ${nowIso}] Slagen ihop med kund ${updatedCustomer.customer_no} (${updatedCustomer.id})`
			: `[MERGED ${nowIso}] Slagen ihop med kund ${updatedCustomer.customer_no} (${updatedCustomer.id})`;

		const { error: archiveError } = await supabase
			.from('customers')
			.update({
				is_archived: true,
				notes: archiveNote,
				updated_by: user.id,
			})
			.eq('id', duplicateId)
			.eq('org_id', membership.org_id);

		if (archiveError) {
			return NextResponse.json({ error: archiveError.message }, { status: 500 });
		}

		try {
			await adminClient.from('audit_log').insert({
				org_id: membership.org_id,
				user_id: user.id,
				action: 'customers.merge',
				entity_type: 'customer',
				entity_id: targetId,
				old_data: {
					target,
					duplicate,
				},
				new_data: {
					customer: updatedCustomer,
					archived_duplicate_id: duplicateId,
				},
			});
		} catch (auditError) {
			console.error('Failed to insert audit log for customer merge', auditError);
		}

		const { data: relationStats } = await supabase
			.from('customer_merge_relations')
			.select('project_count, contact_count, invoice_basis_count')
			.eq('org_id', membership.org_id)
			.eq('customer_id', targetId)
			.single();

		return NextResponse.json({
			customer: updatedCustomer,
			relations: relationStats ?? null,
		});
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: 'Ogiltig indata', details: error.flatten() }, { status: 422 });
		}

		console.error('POST /api/customers/[id]/merge error:', error);
		const message = error instanceof Error ? error.message : 'Internal server error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


