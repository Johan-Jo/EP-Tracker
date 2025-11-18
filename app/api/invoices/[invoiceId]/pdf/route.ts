import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright-core';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { buildInvoicePdfFilename } from '@/lib/exports/invoice-pdf';
import { cookies } from 'next/headers';

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

		const chromiumPath = process.env.CHROMIUM_PATH;
		const launchOptions: Parameters<typeof chromium.launch>[0] = {
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
		};

		if (chromiumPath) {
			launchOptions.executablePath = chromiumPath;
			console.log('Using Chromium from CHROMIUM_PATH:', chromiumPath);
		}

		console.log('Launching Chromium browser...');
		const browser = await chromium.launch(launchOptions);
		console.log('Browser launched successfully');
		
		try {
			const page = await browser.newPage();
			
			// Pass cookies from the current request to Playwright so it can access the authenticated print page
			const cookieStore = await cookies();
			const allCookies = cookieStore.getAll();
			const requestCookies = request.cookies.getAll();
			const printUrlObj = new URL(printUrl);
			const isLocalhost = printUrlObj.hostname === 'localhost' || printUrlObj.hostname === '127.0.0.1';
			
			// Combine cookies from both sources
			const cookieMap = new Map<string, string>();
			allCookies.forEach(c => cookieMap.set(c.name, c.value));
			requestCookies.forEach(c => cookieMap.set(c.name, c.value));
			
			console.log('Setting cookies for Playwright:', {
				cookieCount: cookieMap.size,
				cookieNames: Array.from(cookieMap.keys()),
				hasSupabaseCookies: Array.from(cookieMap.keys()).some(name => 
					name.includes('supabase') || name.includes('sb-') || name.includes('auth')
				),
				printUrl: printUrl,
			});
			
			// Set Cookie header FIRST (before any navigation) - this is critical for httpOnly cookies
			const cookieHeader = Array.from(cookieMap.entries())
				.filter(([_, value]) => value)
				.map(([name, value]) => `${name}=${value}`)
				.join('; ');
			
			if (cookieHeader) {
				await page.setExtraHTTPHeaders({
					Cookie: cookieHeader,
				});
				console.log('Cookie header set via setExtraHTTPHeaders (before navigation)');
			}
			
			// First, navigate to base URL to establish context (this is important for cookie domain)
			const baseUrl = printUrlObj.origin;
			console.log('Navigating to base URL first:', baseUrl);
			await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
			
			// Set cookies via addCookies - this must be done AFTER navigating to set the domain context
			const cookieArray = Array.from(cookieMap.entries())
				.filter(([_, value]) => value)
				.map(([name, value]) => {
					const cookie = allCookies.find(c => c.name === name) || requestCookies.find(c => c.name === name);
					
					return {
						name,
						value,
						domain: printUrlObj.hostname,
						path: cookie?.path || '/',
						secure: printUrlObj.protocol === 'https:',
						sameSite: 'Lax' as const,
					};
				});
			
			if (cookieArray.length > 0) {
				try {
					await page.context().addCookies(cookieArray);
					console.log(`Cookies set via addCookies: ${cookieArray.length} cookies`);
				} catch (cookieError) {
					console.error('Error setting cookies via addCookies:', cookieError);
				}
			}
			
			// Navigate to print page
			console.log('Navigating to print URL:', printUrl);
			await page.goto(printUrl, { 
				waitUntil: 'networkidle',
				timeout: 30000,
			});
			console.log('Page loaded successfully');
			
			// Wait for any async operations to complete
			await new Promise(resolve => setTimeout(resolve, 1000));

			// Check if page loaded successfully
			const pageContent = await page.content();
			if (pageContent.includes('Kunde inte hämta organisationsinformation') || 
			    pageContent.includes('Saknade parametrar') ||
			    pageContent.includes('Fakturaunderlaget måste vara låst')) {
				console.error('Print page error detected:', pageContent);
				throw new Error('Print page failed to load with authenticated data');
			}

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


