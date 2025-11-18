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
	console.log('[Fortnox Export API] ==========================================');
	console.log('[Fortnox Export API] POST /api/integrations/fortnox/export-invoice called');
	console.log('[Fortnox Export API] Request URL:', request.url);
	console.log('[Fortnox Export API] Stack trace:', new Error().stack);
	console.log('[Fortnox Export API] ==========================================');
	
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
		const projectName = searchParams.get('projectName');

		if (!projectId || !periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'projectId, start, and end parameters are required' },
				{ status: 400 }
			);
		}

		// Get Fortnox connection
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox-anslutning saknas. Anslut ditt Fortnox-konto först.' },
				{ status: 404 }
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

		// Fetch Fortnox customer number from customer record
		// Customer numbers are saved when importing customers from Fortnox
		let customerFortnoxNumber: string | null = null;
		
		if (invoiceBasis.customer_id) {
			const { data: customer, error: customerError } = await supabase
				.from('customers')
				.select('fortnox_customer_number')
				.eq('id', invoiceBasis.customer_id)
				.single();

			if (!customerError && customer?.fortnox_customer_number) {
				customerFortnoxNumber = customer.fortnox_customer_number;
				console.log('[Fortnox Export] Using customer number from customers table:', customerFortnoxNumber);
			}
		}

		if (!customerFortnoxNumber || customerFortnoxNumber.trim() === '') {
			return NextResponse.json(
				{ 
					error: 'Kunden saknar Fortnox kundnummer. Importera kunder från Fortnox i Inställningar > Fortnox Integration för att automatiskt koppla kundnummer.'
				},
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

		// Connection already fetched above, reuse it

		// Build Fortnox invoice payload
		console.log('[Fortnox Export API] Building payload with customer number:', customerFortnoxNumber);
		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(
			invoiceBasis as InvoiceBasisRow,
			{
				customerFortnoxNumber,
				projectName: projectName || undefined,
			}
		);

		// Log payload to verify no TotalExcludingVAT
		console.log('[Fortnox Export API] Payload keys:', Object.keys(payload));
		if ('TotalExcludingVAT' in payload || 'TotalVAT' in payload || 'Total' in payload) {
			console.error('[Fortnox Export API] ERROR: Payload contains total fields!', {
				hasTotal: 'Total' in payload,
				hasTotalVAT: 'TotalVAT' in payload,
				hasTotalExcludingVAT: 'TotalExcludingVAT' in payload,
			});
		}

		// Create invoice in Fortnox
		console.log('[Fortnox Export API] Sending request to Fortnox API...');
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

		// Mark invoice_basis as billed (fakturerat)
		const { error: billedError } = await supabase
			.from('invoice_basis')
			.update({ billed_at: new Date().toISOString() })
			.eq('id', invoiceBasis.id);

		if (billedError) {
			console.error('[Fortnox Export API] Failed to mark invoice_basis as billed:', billedError);
			// Don't fail the request if this update fails - the export succeeded
		} else {
			console.log('[Fortnox Export API] Marked invoice_basis as billed (fakturerat)');
		}

		return NextResponse.json({
			success: true,
			fortnoxInvoiceNumber,
			fortnoxDocumentId: fortnoxDocumentId || null,
			message: `Faktura ${fortnoxInvoiceNumber} skapad i Fortnox`,
		});
	} catch (error) {
		console.error('[Fortnox Export API] Fortnox export error:', error);
		
		// Extract error message with more detail
		let errorMessage = 'Ett oväntat fel uppstod';
		if (error instanceof Error) {
			errorMessage = error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		} else if (error && typeof error === 'object' && 'message' in error) {
			errorMessage = String((error as any).message);
		}
		
		console.error('[Fortnox Export API] Error details:', {
			errorType: error instanceof Error ? error.constructor.name : typeof error,
			errorMessage,
			error,
		});
		
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
			console.error('[Fortnox Export API] Failed to save error status:', saveError);
		}

		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}


