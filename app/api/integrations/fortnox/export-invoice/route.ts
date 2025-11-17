import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { getFortnoxConnectionForOrg, createFortnoxInvoice } from '@/lib/integrations/fortnox/client';
import { buildFortnoxInvoicePayloadFromInvoiceBasis } from '@/lib/integrations/fortnox/export-invoice';
import type { InvoiceBasisRow } from '@/lib/integrations/fortnox/export-invoice';

/**
 * POST /api/integrations/fortnox/export-invoice
 * Export a locked invoice_basis to Fortnox
 * 
 * Query params:
 * - projectId: Project ID
 * - start: Period start (YYYY-MM-DD)
 * - end: Period end (YYYY-MM-DD)
 * - customerFortnoxNumber: Fortnox customer number (required)
 * - projectName: Optional project name
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can export
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('projectId');
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');
		const customerFortnoxNumberParam = searchParams.get('customerFortnoxNumber');
		const projectName = searchParams.get('projectName');

		if (!projectId || !periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'projectId, start, and end parameters are required' },
				{ status: 400 }
			);
		}

		// Get Fortnox connection (to check for saved customer number)
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.' },
				{ status: 404 }
			);
		}

		// Use provided customer number, or fall back to saved one from connection
		const customerFortnoxNumber = customerFortnoxNumberParam || connection.fortnox_customer_number;

		if (!customerFortnoxNumber) {
			return NextResponse.json(
				{ error: 'Fortnox kundnummer krävs. Ange kundnummer eller anslut ditt Fortnox-konto för att hämta det automatiskt.' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Fetch locked invoice_basis record
		const { data: invoiceBasis, error: invoiceBasisError } = await supabase
			.from('invoice_basis')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('project_id', projectId)
			.eq('period_start', periodStart)
			.eq('period_end', periodEnd)
			.eq('locked', true)
			.single();

		if (invoiceBasisError || !invoiceBasis) {
			return NextResponse.json(
				{ error: 'Fakturaunderlaget måste vara låst för export. Lås underlaget först.' },
				{ status: 400 }
			);
		}

		// Check if already exported
		const { data: existingLink } = await supabase
			.from('fortnox_invoice_links')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('invoice_basis_id', invoiceBasis.id)
			.single();

		if (existingLink && existingLink.status === 'created') {
			return NextResponse.json(
				{ 
					error: 'Fakturan är redan exporterad till Fortnox',
					fortnoxInvoiceNumber: existingLink.fortnox_invoice_number 
				},
				{ status: 400 }
			);
		}

		// Get Fortnox connection
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Ingen Fortnox-anslutning konfigurerad för denna organisation' },
				{ status: 400 }
			);
		}

		// Build Fortnox invoice payload
		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(
			invoiceBasis as InvoiceBasisRow,
			{
				customerFortnoxNumber,
				projectName: projectName || undefined,
			}
		);

		// Create invoice in Fortnox
		const fortnoxResponse = await createFortnoxInvoice(connection, payload);

		// Extract invoice number from response
		// Fortnox API typically returns { Invoice: { DocumentNumber: "...", ... } }
		const fortnoxInvoice = (fortnoxResponse as { Invoice?: unknown })?.Invoice as { DocumentNumber?: string; DocumentID?: string } | undefined;
		const fortnoxInvoiceNumber = fortnoxInvoice?.DocumentNumber || '';
		const fortnoxDocumentId = fortnoxInvoice?.DocumentID || '';

		// Create or update fortnox_invoice_links record
		const linkData = {
			org_id: membership.org_id,
			invoice_basis_id: invoiceBasis.id,
			fortnox_invoice_number: fortnoxInvoiceNumber,
			fortnox_document_id: fortnoxDocumentId || null,
			payload_json: payload,
			response_json: fortnoxResponse,
			status: 'created' as const,
			error_message: null,
		};

		if (existingLink) {
			// Update existing link
			const { error: updateError } = await supabase
				.from('fortnox_invoice_links')
				.update(linkData)
				.eq('id', existingLink.id);

			if (updateError) {
				console.error('Failed to update fortnox_invoice_links:', updateError);
				return NextResponse.json(
					{ error: 'Kunde inte uppdatera exportstatus' },
					{ status: 500 }
				);
			}
		} else {
			// Create new link
			const { error: insertError } = await supabase
				.from('fortnox_invoice_links')
				.insert(linkData);

			if (insertError) {
				console.error('Failed to create fortnox_invoice_links:', insertError);
				return NextResponse.json(
					{ error: 'Kunde inte skapa exportstatus' },
					{ status: 500 }
				);
			}
		}

		return NextResponse.json({
			success: true,
			fortnoxInvoiceNumber,
			fortnoxDocumentId: fortnoxDocumentId || null,
			message: `Faktura ${fortnoxInvoiceNumber} skapad i Fortnox`,
		});
	} catch (error) {
		console.error('Fortnox export error:', error);
		
		// Try to save error status if we have the invoice_basis_id
		try {
			const searchParams = request.nextUrl.searchParams;
			const projectId = searchParams.get('projectId');
			const periodStart = searchParams.get('start');
			const periodEnd = searchParams.get('end');
			
			if (projectId && periodStart && periodEnd) {
				const { user, membership } = await getSession();
				if (user && membership) {
					const supabase = await createClient();
					const { data: invoiceBasis } = await supabase
						.from('invoice_basis')
						.select('id')
						.eq('org_id', membership.org_id)
						.eq('project_id', projectId)
						.eq('period_start', periodStart)
						.eq('period_end', periodEnd)
						.eq('locked', true)
						.single();

					if (invoiceBasis) {
						const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
						await supabase
							.from('fortnox_invoice_links')
							.upsert({
								org_id: membership.org_id,
								invoice_basis_id: invoiceBasis.id,
								fortnox_invoice_number: '',
								status: 'failed',
								error_message: errorMessage,
							}, {
								onConflict: 'org_id,invoice_basis_id',
							});
					}
				}
			}
		} catch (saveError) {
			console.error('Failed to save error status:', saveError);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}


