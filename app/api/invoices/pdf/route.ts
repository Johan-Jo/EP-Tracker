import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { chromium } from 'playwright-core';
import { buildInvoicePdfFilename } from '@/lib/exports/invoice-pdf';
import { createPdfToken } from '@/lib/auth/pdf-token';

export async function GET(request: NextRequest) {
	console.log('[PDF Export] Starting PDF generation request');

	let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

	try {
		// 1. Verify Supabase session and role (admin/foreman)
		console.log('[PDF Export] Getting session...');
		const { user, membership } = await getSession();
		console.log('[PDF Export] Session retrieved:', {
			hasUser: !!user,
			hasMembership: !!membership,
			userRole: membership?.role,
		});

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

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

		// 2. Verify that invoice_basis is locked
		console.log('[PDF Export] Creating Supabase client...');
		const supabase = await createClient();

		console.log('[PDF Export] Verifying invoice basis is locked...', {
			projectId,
			periodStart,
			periodEnd,
		});

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
				{
					error:
						'Fakturaunderlaget måste vara låst för export. Lås underlaget först.',
				},
				{ status: 400 }
			);
		}

		// 3. Build filename from invoice + customer
		let customerName: string | null = null;
		if (
			invoiceBasis.customer_snapshot &&
			typeof invoiceBasis.customer_snapshot === 'object'
		) {
			const snap = invoiceBasis.customer_snapshot as any;
			customerName =
				snap.company_name ||
				snap.name ||
				[snap.first_name, snap.last_name].filter(Boolean).join(' ') ||
				null;
		}

		if (
			!customerName &&
			invoiceBasis.invoice_address_json &&
			typeof invoiceBasis.invoice_address_json === 'object'
		) {
			const addr = invoiceBasis.invoice_address_json as any;
			customerName = addr.name || null;
		}

		console.log('[PDF Export] Building filename...');
		const filename = buildInvoicePdfFilename(invoiceBasis, customerName);

		// 4. Create short-lived PDF token (no cookies needed for Playwright)
		const pdfToken = createPdfToken({
			sub: user.id,
			org_id: membership.org_id,
			role: (membership.role as any) || 'admin',
		});

		// 5. Build absolute URL to print page including pdfToken
		console.log('[PDF Export] Building print URL...');
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
			'http://localhost:3000';

		const printUrl =
			`${baseUrl}/invoices/print` +
			`?projectId=${encodeURIComponent(projectId)}` +
			`&start=${encodeURIComponent(periodStart)}` +
			`&end=${encodeURIComponent(periodEnd)}` +
			`&pdfToken=${encodeURIComponent(pdfToken)}`;

		console.log('[PDF Export] Print URL with token:', printUrl);

		// 6. Launch headless Chromium (no cookie hacks anymore)
		const chromiumPath = process.env.CHROMIUM_PATH;

		const launchOptions: Parameters<typeof chromium.launch>[0] = {
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
		};

		if (chromiumPath) {
			launchOptions.executablePath = chromiumPath;
			console.log('Using Chromium from CHROMIUM_PATH:', chromiumPath);
		} else {
			console.log('Using system Playwright (no CHROMIUM_PATH set)');
		}

		console.log('Launching Chromium browser...');
		try {
			browser = await chromium.launch(launchOptions);
			console.log('Browser launched successfully');
		} catch (launchError) {
			console.error('Failed to launch browser:', launchError);
			console.error('Launch options:', JSON.stringify(launchOptions, null, 2));
			throw new Error(
				`Failed to launch Chromium browser: ${
					launchError instanceof Error ? launchError.message : String(launchError)
				}. Make sure Playwright is installed (run: npx playwright install chromium)`
			);
		}

		const page = await browser.newPage();

		console.log('Navigating to print URL:', printUrl);
		await page.goto(printUrl, {
			waitUntil: 'networkidle',
			timeout: 30000,
		});

		const finalUrl = page.url();
		console.log('Final URL after navigation:', finalUrl);

		if (finalUrl.includes('/sign-in')) {
			throw new Error(
				'Authentication failed: print page redirected to sign-in, pdfToken auth not working.'
			);
		}

		// Let any async operations finish
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log('Generating PDF...');
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
		console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

		await browser.close();
		browser = null;

		// Track export batch as before
		await supabase.from('integration_batches').insert({
			org_id: membership.org_id,
			batch_type: 'invoice_pdf',
			period_start: periodStart,
			period_end: periodEnd,
			file_size_bytes: pdfBuffer.length,
			record_count:
				(invoiceBasis.lines_json?.lines?.length || 0) +
				(invoiceBasis.lines_json?.diary?.length || 0),
			created_by: user.id,
		});

		return new NextResponse(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': pdfBuffer.length.toString(),
			},
		});
	} catch (error) {
		if (browser) {
			try {
				await browser.close();
			} catch (closeError) {
				console.error('Error closing browser:', closeError);
			}
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('PDF generation error:', errorMessage);

		return NextResponse.json(
			{
				error: 'Kunde inte generera PDF.',
				details: errorMessage,
			},
			{ status: 500 }
		);
	}
}
