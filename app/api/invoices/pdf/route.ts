import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { chromium } from 'playwright-core';
import { buildInvoicePdfFilename } from '@/lib/exports/invoice-pdf';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can export
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('projectId');
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');

		if (!projectId || !periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'projectId, start och end parametrar krävs' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Verify invoice_basis is locked
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

		// Get customer name for filename
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

		// Build absolute URL to print page
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
			'http://localhost:3000';
		
		const printUrl = `${baseUrl}/invoices/print?projectId=${encodeURIComponent(projectId)}&start=${encodeURIComponent(periodStart)}&end=${encodeURIComponent(periodEnd)}`;

		// Launch headless browser
		let browser;
		try {
			// For serverless environments (Vercel), we might need @sparticuz/chromium
			// For local/dev, use system Playwright
			const chromiumPath = process.env.CHROMIUM_PATH;
			
			const launchOptions: Parameters<typeof chromium.launch>[0] = {
				headless: true,
			};

			if (chromiumPath) {
				launchOptions.executablePath = chromiumPath;
				launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
			}
			
			browser = await chromium.launch(launchOptions);

			const page = await browser.newPage();
			
			// Pass cookies from the current request to Playwright so it can access the authenticated print page
			const cookies = request.headers.get('cookie');
			if (cookies) {
				const cookieArray = cookies.split(';').map(c => {
					const [name, ...valueParts] = c.trim().split('=');
					return {
						name,
						value: valueParts.join('='),
						domain: new URL(printUrl).hostname,
						path: '/',
					};
				});
				await page.context().addCookies(cookieArray);
			}
			
			// Navigate to print page
			await page.goto(printUrl, {
				waitUntil: 'networkidle',
				timeout: 30000,
			});

			// Generate PDF
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

			await browser.close();

			// Track export batch
			await supabase.from('integration_batches').insert({
				org_id: membership.org_id,
				batch_type: 'invoice_pdf',
				period_start: periodStart,
				period_end: periodEnd,
				file_size_bytes: pdfBuffer.length,
				record_count: (invoiceBasis.lines_json?.lines?.length || 0) + (invoiceBasis.lines_json?.diary?.length || 0),
				created_by: user.id,
			});

			// Return PDF
			return new NextResponse(pdfBuffer, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `attachment; filename="${filename}"`,
					'Content-Length': pdfBuffer.length.toString(),
				},
			});
		} catch (error) {
			if (browser) {
				await browser.close().catch(() => {});
			}
			console.error('PDF generation error:', error);
			return NextResponse.json(
				{ error: 'Kunde inte generera PDF. Kontrollera att Playwright är korrekt konfigurerad.' },
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Invoice PDF export error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

