import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright-core';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { buildInvoicePdfFilename } from '@/lib/exports/invoice-pdf';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
	const { invoiceId } = params;

	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		const supabase = await createClient();

		// Load invoice basis by id
		const { data: invoiceBasis, error: invoiceError } = await supabase
			.from('invoice_basis')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('id', invoiceId)
			.single();

		if (invoiceError || !invoiceBasis) {
			return NextResponse.json({ error: 'Fakturaunderlag hittades inte' }, { status: 404 });
		}

		if (!invoiceBasis.locked) {
			return NextResponse.json(
				{ error: 'Fakturaunderlaget måste vara låst innan PDF kan skapas' },
				{ status: 400 }
			);
		}

		// Load organization to include in filename context
		const { data: organization } = await supabase
			.from('organizations')
			.select('name')
			.eq('id', membership.org_id)
			.single();

		// Resolve customer name for filename (from snapshot or invoice address)
		let customerName: string | null = null;
		if (invoiceBasis.customer_snapshot && typeof invoiceBasis.customer_snapshot === 'object') {
			const snap = invoiceBasis.customer_snapshot as any;
			customerName =
				snap.company_name ||
				snap.name ||
				[snap.first_name, snap.last_name].filter(Boolean).join(' ') ||
				null;
		}
		if (!customerName && invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object') {
			const addr = invoiceBasis.invoice_address_json as any;
			customerName = addr.name || null;
		}

		const filename = buildInvoicePdfFilename(invoiceBasis, customerName);

		// Build absolute URL to print view
		const origin = request.nextUrl.origin;
		const printUrl = `${origin}/invoices/${invoiceId}/print`;

		const browser = await chromium.launch();
		try {
			const page = await browser.newPage();
			await page.goto(printUrl, { waitUntil: 'networkidle' });

			const pdfBuffer = await page.pdf({
				format: 'A4',
				printBackground: true,
				margin: {
					top: '20mm',
					right: '15mm',
					bottom: '20mm',
					left: '15mm',
				},
			});

			return new NextResponse(pdfBuffer as unknown as BodyInit, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `attachment; filename="${filename}"`,
					'Content-Length': pdfBuffer.length.toString(),
				},
			});
		} finally {
			await browser.close();
		}
	} catch (error) {
		console.error('Invoice HTML->PDF export error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod vid export av faktura' },
			{ status: 500 }
		);
	}
}


