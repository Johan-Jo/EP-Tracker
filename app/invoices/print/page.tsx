import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import Image from 'next/image';
import { verifyPdfToken } from '@/lib/auth/pdf-token';

interface DiarySummary {
	date: string;
	raw: string;
	summary: string;
	line_ref: string;
}

// Helper to format currency with Swedish locale
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('sv-SE', {
		style: 'currency',
		currency: 'SEK',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

// Helper to format numbers (quantities, VAT rates)
function formatNumber(value: number, decimals = 2): string {
	return new Intl.NumberFormat('sv-SE', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
}

// Helper to format date
function formatDate(dateString: string | null): string {
	if (!dateString) return '';
	return format(new Date(dateString), 'yyyy-MM-dd', { locale: sv });
}

// Calculate line amounts
function calculateLineAmounts(
	line: InvoiceBasisLine
): {
	amountExclVAT: number;
	amountVAT: number;
	amountInclVAT: number;
} {
	if (line.type === 'diary') {
		return { amountExclVAT: 0, amountVAT: 0, amountInclVAT: 0 };
	}

	const quantity = line.quantity || 0;
	const unitPrice = line.unit_price || 0;
	const discount = line.discount || 0;
	const vatRate = line.vat_rate || 0;

	const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
	const amountExclVAT =
		Math.round(quantity * unitPrice * discountFactor * 100) / 100;
	const amountVAT = Math.round((amountExclVAT * vatRate) / 100 * 100) / 100;
	const amountInclVAT =
		Math.round((amountExclVAT + amountVAT) * 100) / 100;

	return { amountExclVAT, amountVAT, amountInclVAT };
}

// Format quantity helper (Swedish locale, comma decimal)
function formatQuantity(value: number): string {
	return formatNumber(value, 2);
}

export default async function InvoicePrintPage({
	searchParams,
}: {
	searchParams: Promise<{
		projectId?: string;
		start?: string;
		end?: string;
		pdfToken?: string;
	}>;
}) {
	const params = await searchParams;
	const { projectId, start, end, pdfToken } = params;

	if (!projectId || !start || !end) {
		return (
			<div className="p-8">
				<p className="text-destructive">
					Saknade parametrar: projectId, start och end krävs.
				</p>
			</div>
		);
	}

	let orgId: string | null = null;
	let supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;
	let userCanAccess = false;

	// MODE 1: PDF export via pdfToken (no cookies)
	if (pdfToken) {
		const payload = verifyPdfToken(pdfToken);

		if (!payload) {
			return (
				<div className="p-8">
					<p className="text-destructive">
						Ogiltig eller utgången pdfToken.
					</p>
				</div>
			);
		}

		orgId = payload.org_id;
		userCanAccess =
			payload.role === 'admin' || payload.role === 'foreman';

		if (!userCanAccess) {
			return (
				<div className="p-8">
					<p className="text-destructive">
						Åtkomst nekad för pdf-export.
					</p>
				</div>
			);
		}

		// Service-role client (no cookies / user session needed)
		supabase = createAdminClient();
	} else {
		// MODE 2: Normal browser view – use Supabase SSR session
		const { user, membership } = await getSession();
		if (!user || !membership) {
			redirect('/sign-in');
		}

		orgId = membership!.org_id;
		userCanAccess =
			membership!.role === 'admin' || membership!.role === 'foreman';

		if (!userCanAccess) {
			redirect('/');
		}

		supabase = await createClient();
	}

	// Fetch locked invoice_basis using orgId determined above
	const { data: invoiceBasis, error: invoiceBasisError } = await supabase
		.from('invoice_basis')
		.select('*')
		.eq('org_id', orgId)
		.eq('project_id', projectId)
		.eq('period_start', start)
		.eq('period_end', end)
		.eq('locked', true)
		.single();

	if (invoiceBasisError || !invoiceBasis) {
		return (
			<div className="p-8">
				<p className="text-destructive">
					Fakturaunderlaget måste vara låst för export. Lås underlaget först.
				</p>
			</div>
		);
	}

	// Fetch organization
	const { data: organization, error: orgError } = await supabase
		.from('organizations')
		.select(
			'name, org_number, phone, address, postal_code, city, bankgiro, plusgiro, iban, bic, logo_url, vat_number, vat_registered'
		)
		.eq('id', orgId)
		.single();

	if (orgError || !organization) {
		console.error('Error fetching organization:', orgError);
		return (
			<div className="p-8">
				<p className="text-destructive">
					Kunde inte hämta organisationsinformation.
				</p>
				{orgError && (
					<p className="mt-2 text-sm text-muted-foreground">
						Fel: {orgError.message}
					</p>
				)}
			</div>
		);
	}

	// Fetch project
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('name')
		.eq('id', projectId)
		.single();

	if (projectError || !project) {
		return (
			<div className="p-8">
				<p className="text-destructive">
					Kunde inte hämta projektinformation.
				</p>
			</div>
		);
	}

	const lines = (invoiceBasis.lines_json?.lines || []) as InvoiceBasisLine[];
	const diarySummaries = (invoiceBasis.lines_json?.diary || []) as DiarySummary[];
	const nonDiaryLines = lines.filter((line) => line.type !== 'diary');

	// Separate lines by type
	const timeLines = nonDiaryLines.filter((line) => line.type === 'time');
	const materialLines = nonDiaryLines.filter((line) => line.type === 'material');
	const expenseLines = nonDiaryLines.filter((line) => line.type === 'expense');
	const otherLines = nonDiaryLines.filter(
		(line) => line.type !== 'time' && line.type !== 'material' && line.type !== 'expense'
	);

	// Calculate totals: hours and material
	const totalHours = timeLines.reduce((sum, line) => sum + (line.quantity || 0), 0);

	const totalTimeAmount = timeLines.reduce((sum, line) => {
		const { amountExclVAT } = calculateLineAmounts(line);
		return sum + amountExclVAT;
	}, 0);

	const totalMaterialQuantity = materialLines.reduce((sum, line) => sum + (line.quantity || 0), 0);

	const totalMaterialAmount = materialLines.reduce((sum, line) => {
		const { amountExclVAT } = calculateLineAmounts(line);
		return sum + amountExclVAT;
	}, 0);

	const totalExpenseQuantity = expenseLines.reduce((sum, line) => sum + (line.quantity || 0), 0);

	const totalExpenseAmount = expenseLines.reduce((sum, line) => {
		const { amountExclVAT } = calculateLineAmounts(line);
		return sum + amountExclVAT;
	}, 0);

	const totalOtherQuantity = otherLines.reduce((sum, line) => sum + (line.quantity || 0), 0);

	const totalOtherAmount = otherLines.reduce((sum, line) => {
		const { amountExclVAT } = calculateLineAmounts(line);
		return sum + amountExclVAT;
	}, 0);

	const invoiceAddr =
		invoiceBasis.invoice_address_json &&
		typeof invoiceBasis.invoice_address_json === 'object'
			? (invoiceBasis.invoice_address_json as Record<string, unknown>)
			: null;

	const customerName =
		invoiceBasis.customer_snapshot &&
		typeof invoiceBasis.customer_snapshot === 'object' &&
		invoiceBasis.customer_snapshot !== null
			? (
					(invoiceBasis.customer_snapshot as { name?: string; company_name?: string }).name ||
					(invoiceBasis.customer_snapshot as { company_name?: string }).company_name ||
					'Ingen kund kopplad'
				)
			: invoiceAddr && invoiceAddr.name
			? String(invoiceAddr.name)
			: 'Ingen kund kopplad';

	const invoiceNo =
		(invoiceBasis.invoice_series ? `${invoiceBasis.invoice_series} ` : '') +
		(invoiceBasis.invoice_number ?? '');

	const totals = invoiceBasis.totals;

	return (
		<div className="min-h-screen bg-white print:bg-white">
			{/* Print-specific styles */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
					@media print {
						@page {
							size: A4;
							margin: 20mm 15mm;
						}
						body {
							margin: 0;
							background: white !important;
							-webkit-print-color-adjust: exact;
							print-color-adjust: exact;
						}
						.no-print {
							display: none !important;
						}
						table {
							page-break-inside: avoid;
						}
						thead {
							display: table-header-group;
						}
						tbody {
							display: table-row-group;
						}
						tr {
							page-break-inside: avoid;
						}
						table, th, td {
							border-collapse: collapse;
						}
					}
				`,
				}}
			/>
			<main className="mx-auto my-8 w-full max-w-[800px] px-8 text-[11pt] leading-relaxed text-black">
				{/* Header: Logo + FAKTURA */}
				<header className="flex items-start justify-between">
					{/* Left: Logo or org name */}
					<div>
						{organization.logo_url ? (
							<Image
								src={organization.logo_url}
								alt={organization.name}
								width={120}
								height={56}
								className="h-14 w-auto object-contain"
								unoptimized
							/>
						) : (
							<div className="text-lg font-semibold">
								{organization.name}
							</div>
						)}
					</div>

					{/* Right: FAKTURA + metadata */}
					<div className="text-right text-sm">
						<div className="text-lg font-bold tracking-[0.16em]">
							FAKTURA
						</div>
						<div className="mt-2 space-y-1">
							{invoiceNo.trim() && (
								<div>Fakturanummer: {invoiceNo.trim()}</div>
							)}
							{invoiceBasis.invoice_date && (
								<div>
									Fakturadatum: {formatDate(invoiceBasis.invoice_date)}
								</div>
							)}
							{invoiceBasis.due_date && (
								<div>
									Förfallodatum: {formatDate(invoiceBasis.due_date)}
								</div>
							)}
							<div>
								Betalvillkor:{' '}
								{invoiceBasis.payment_terms_days ?? 30} dagar
							</div>
						</div>
					</div>
				</header>

				{/* Seller / Buyer blocks */}
				<section className="mt-6 grid grid-cols-2 gap-8 text-sm">
					{/* Seller */}
					<div>
						<h2 className="mb-1 text-sm font-semibold tracking-tight">Säljare</h2>
						<div className="space-y-0.5">
							<div>{organization.name}</div>
							{organization.address && (
								<div>{organization.address}</div>
							)}
							{(organization.postal_code || organization.city) && (
								<div>
									{organization.postal_code} {organization.city}
								</div>
							)}
							{organization.org_number && (
								<div>Org.nr: {organization.org_number}</div>
							)}
							{organization.vat_number && (
								<div>Momsreg.nr: {organization.vat_number}</div>
							)}
						</div>
					</div>

					{/* Buyer */}
					<div>
						<h2 className="mb-1 text-sm font-semibold tracking-tight">Kund</h2>
						<div className="space-y-0.5">
							<div>{customerName}</div>
							{invoiceAddr && invoiceAddr.street && (
								<div>{String(invoiceAddr.street)}</div>
							)}
							{invoiceAddr &&
								((invoiceAddr.zip as string) ||
									(invoiceAddr.city as string)) && (
									<div>
										{invoiceAddr.zip} {invoiceAddr.city}
									</div>
								)}
							{invoiceAddr && invoiceAddr.country && (
								<div>{String(invoiceAddr.country)}</div>
							)}
							{invoiceAddr && invoiceAddr.org_no && (
								<div>Org.nr: {String(invoiceAddr.org_no)}</div>
							)}
						</div>
					</div>
				</section>

				{/* Fakturaöversikt */}
				<section className="mt-6 text-sm">
					<h2 className="mb-1 text-sm font-semibold tracking-tight">Fakturaöversikt</h2>
					<div className="space-y-0.5">
						{project.name && <div>Projekt: {project.name}</div>}
						<div>
							Period: {formatDate(invoiceBasis.period_start)} –{' '}
							{formatDate(invoiceBasis.period_end)}
						</div>
						{totalHours > 0 && (
							<div>Total tid: {formatNumber(totalHours, 2)} timmar</div>
						)}
						{totalMaterialQuantity > 0 && (
							<div>
								Total material: {formatNumber(totalMaterialQuantity, 2)} st (
								{formatCurrency(totalMaterialAmount)})
							</div>
						)}
						{invoiceBasis.our_ref && (
							<div>Vår referens: {invoiceBasis.our_ref}</div>
						)}
						{invoiceBasis.your_ref && (
							<div>Er referens: {invoiceBasis.your_ref}</div>
						)}
					</div>
				</section>

				{/* Tidblock Section */}
				{timeLines.length > 0 && (
					<section className="mt-8">
						<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
							Tidblock
						</h3>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-300 bg-gray-50">
									<th className="py-2 pr-2 text-left font-semibold">Datum</th>
									<th className="py-2 pr-2 text-left font-semibold">Person</th>
									<th className="py-2 pr-2 text-left font-semibold">Dagbok</th>
									<th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
										Timmar
									</th>
									<th className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
										Summa ex moms
									</th>
								</tr>
							</thead>
							<tbody>
								{timeLines.map((line) => {
									const { amountExclVAT } = calculateLineAmounts(line);
									return (
										<tr key={line.id} className="border-b border-gray-200 align-top">
											<td className="py-1.5 pr-2">
												{line.date ? formatDate(line.date) : '–'}
											</td>
											<td className="py-1.5 pr-2 whitespace-nowrap">
												{line.person || '–'}
											</td>
											<td className="py-1.5 pr-2 text-xs text-gray-600">
												{line.diary || '–'}
											</td>
											<td className="py-1.5 pr-2 text-right whitespace-nowrap">
												{formatQuantity(line.quantity || 0)}
											</td>
											<td className="py-1.5 pl-2 text-right whitespace-nowrap">
												{formatCurrency(amountExclVAT)}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="bg-gray-50 border-t-2 border-gray-300">
								<tr className="text-sm font-semibold">
									<td className="py-2 pr-2" colSpan={3}>
										Summa
									</td>
									<td className="py-2 pr-2 text-right whitespace-nowrap">
										{formatQuantity(totalHours)}
									</td>
									<td className="py-2 pl-2 text-right whitespace-nowrap">
										{formatCurrency(totalTimeAmount)}
									</td>
								</tr>
							</tfoot>
						</table>
					</section>
				)}

				{/* Material Section */}
				{materialLines.length > 0 && (
					<section className="mt-8">
						<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
							Material
						</h3>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-300 bg-gray-50">
									<th className="py-2 pr-2 text-left font-semibold">Datum</th>
									<th className="py-2 pr-2 text-left font-semibold">Beskrivning</th>
									<th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
										Antal
									</th>
									<th className="py-2 pr-2 text-left font-semibold whitespace-nowrap">
										Enhet
									</th>
									<th className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
										Summa ex moms
									</th>
								</tr>
							</thead>
							<tbody>
								{materialLines.map((line) => {
									const { amountExclVAT } = calculateLineAmounts(line);
									return (
										<tr key={line.id} className="border-b border-gray-200 align-top">
											<td className="py-1.5 pr-2">
												{line.date ? formatDate(line.date) : '–'}
											</td>
											<td className="py-1.5 pr-2">{line.description || '–'}</td>
											<td className="py-1.5 pr-2 text-right whitespace-nowrap">
												{formatQuantity(line.quantity || 0)}
											</td>
											<td className="py-1.5 pr-2 whitespace-nowrap">
												{line.unit || '–'}
											</td>
											<td className="py-1.5 pl-2 text-right whitespace-nowrap">
												{formatCurrency(amountExclVAT)}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="bg-gray-50 border-t-2 border-gray-300">
								<tr className="text-sm font-semibold">
									<td className="py-2 pr-2"></td>
									<td className="py-2 pr-2">Summa</td>
									<td className="py-2 pr-2 text-right whitespace-nowrap">
										{formatQuantity(totalMaterialQuantity)}
									</td>
									<td className="py-2 pr-2"></td>
									<td className="py-2 pl-2 text-right whitespace-nowrap">
										{formatCurrency(totalMaterialAmount)}
									</td>
								</tr>
							</tfoot>
						</table>
					</section>
				)}

				{/* Utlägg Section */}
				{expenseLines.length > 0 && (
					<section className="mt-8">
						<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
							Utlägg
						</h3>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-300 bg-gray-50">
									<th className="py-2 pr-2 text-left font-semibold">Datum</th>
									<th className="py-2 pr-2 text-left font-semibold">Beskrivning</th>
									<th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
										Antal
									</th>
									<th className="py-2 pr-2 text-left font-semibold whitespace-nowrap">
										Enhet
									</th>
									<th className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
										Summa ex moms
									</th>
								</tr>
							</thead>
							<tbody>
								{expenseLines.map((line) => {
									const { amountExclVAT } = calculateLineAmounts(line);
									return (
										<tr key={line.id} className="border-b border-gray-200 align-top">
											<td className="py-1.5 pr-2">
												{line.date ? formatDate(line.date) : '–'}
											</td>
											<td className="py-1.5 pr-2">{line.description || '–'}</td>
											<td className="py-1.5 pr-2 text-right whitespace-nowrap">
												{formatQuantity(line.quantity || 0)}
											</td>
											<td className="py-1.5 pr-2 whitespace-nowrap">
												{line.unit || '–'}
											</td>
											<td className="py-1.5 pl-2 text-right whitespace-nowrap">
												{formatCurrency(amountExclVAT)}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="bg-gray-50 border-t-2 border-gray-300">
								<tr className="text-sm font-semibold">
									<td className="py-2 pr-2"></td>
									<td className="py-2 pr-2">Summa</td>
									<td className="py-2 pr-2 text-right whitespace-nowrap">
										{formatQuantity(totalExpenseQuantity)}
									</td>
									<td className="py-2 pr-2"></td>
									<td className="py-2 pl-2 text-right whitespace-nowrap">
										{formatCurrency(totalExpenseAmount)}
									</td>
								</tr>
							</tfoot>
						</table>
					</section>
				)}

				{/* Övrigt Section */}
				{otherLines.length > 0 && (
					<section className="mt-8">
						<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
							Övrigt
						</h3>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-gray-300 bg-gray-50">
									<th className="py-2 pr-2 text-left font-semibold">Datum</th>
									<th className="py-2 pr-2 text-left font-semibold">Beskrivning</th>
									<th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
										Antal
									</th>
									<th className="py-2 pr-2 text-left font-semibold whitespace-nowrap">
										Enhet
									</th>
									<th className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
										Summa ex moms
									</th>
								</tr>
							</thead>
							<tbody>
								{otherLines.map((line) => {
									const { amountExclVAT } = calculateLineAmounts(line);
									return (
										<tr key={line.id} className="border-b border-gray-200 align-top">
											<td className="py-1.5 pr-2">
												{line.date ? formatDate(line.date) : '–'}
											</td>
											<td className="py-1.5 pr-2">{line.description || '–'}</td>
											<td className="py-1.5 pr-2 text-right whitespace-nowrap">
												{formatQuantity(line.quantity || 0)}
											</td>
											<td className="py-1.5 pr-2 whitespace-nowrap">
												{line.unit || '–'}
											</td>
											<td className="py-1.5 pl-2 text-right whitespace-nowrap">
												{formatCurrency(amountExclVAT)}
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot className="bg-gray-50 border-t-2 border-gray-300">
								<tr className="text-sm font-semibold">
									<td className="py-2 pr-2"></td>
									<td className="py-2 pr-2">Summa</td>
									<td className="py-2 pr-2 text-right whitespace-nowrap">
										{formatQuantity(totalOtherQuantity)}
									</td>
									<td className="py-2 pr-2"></td>
									<td className="py-2 pl-2 text-right whitespace-nowrap">
										{formatCurrency(totalOtherAmount)}
									</td>
								</tr>
							</tfoot>
						</table>
					</section>
				)}

				{/* Summeringar Section */}
				{totals && (
					<section className="mt-8">
						<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
							Summeringar
						</h3>
						<div className="space-y-4">
							{/* Main totals grid */}
							<div className="grid grid-cols-3 gap-4">
								<div className="rounded-md border border-emerald-300 bg-emerald-50/70 px-3 py-2">
									<div className="text-xs uppercase text-emerald-600">
										Netto exkl. moms
									</div>
									<div className="text-lg font-semibold text-gray-900">
										{formatCurrency(totals.total_ex_vat)}
									</div>
								</div>
								<div className="rounded-md border border-amber-300 bg-amber-50/70 px-3 py-2">
									<div className="text-xs uppercase text-amber-600">Moms</div>
									<div className="text-lg font-semibold text-gray-900">
										{formatCurrency(totals.total_vat)}
									</div>
								</div>
								<div className="rounded-md border border-blue-300 bg-blue-50/70 px-3 py-2">
									<div className="text-xs uppercase text-blue-600">Totalt</div>
									<div className="text-lg font-semibold text-gray-900">
										{formatCurrency(totals.total_inc_vat)}
									</div>
								</div>
							</div>

							{/* VAT per rate */}
							{totals.per_vat_rate &&
								Object.entries(totals.per_vat_rate).some(
									([, vatData]) => vatData.base > 0
								) && (
									<div className="rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2">
										{Object.entries(totals.per_vat_rate).map(([rate, values]) => {
											if (values.base <= 0) return null;
											const vatRate = parseFloat(rate);
											return (
												<div key={rate} className="mb-2 last:mb-0">
													<div className="text-xs font-semibold uppercase text-gray-600">
														Moms {vatRate}%
													</div>
													<div className="text-xs text-gray-700">
														Exkl: {formatCurrency(values.base)}
													</div>
													<div className="text-xs text-gray-700">
														Moms: {formatCurrency(values.vat)}
													</div>
													<div className="text-xs text-gray-700">
														Inkl: {formatCurrency(values.total)}
													</div>
												</div>
											);
										})}
									</div>
								)}
						</div>
					</section>
				)}

				{/* Reverse charge building */}
				{invoiceBasis.reverse_charge_building && (
					<div className="mt-6 text-sm italic text-gray-600">
						Omvänd byggmoms enligt 6 kap. 12 § mervärdesskattelagen.
					</div>
				)}

				{/* Payment information */}
				<section className="mt-10 text-sm">
					<h2 className="mb-1 text-sm font-semibold tracking-tight">Betalningsinformation</h2>
					<div className="space-y-0.5">
						{organization.bankgiro && (
							<div>Bankgiro: {organization.bankgiro}</div>
						)}
						{organization.plusgiro && (
							<div>Plusgiro: {organization.plusgiro}</div>
						)}
						{organization.iban && (
							<div>IBAN: {organization.iban}</div>
						)}
						{organization.bic && (
							<div>BIC/SWIFT: {organization.bic}</div>
						)}
						<div>Ange fakturanummer som referens vid betalning.</div>
					</div>
				</section>

				{/* Footer */}
				<footer className="mt-8 border-t border-gray-300 pt-2 text-[9pt] text-gray-600">
					{organization.name}
					{organization.org_number &&
						` – Org.nr ${organization.org_number}`}
					{organization.city && ` – Säte: ${organization.city}`}
				</footer>
			</main>
		</div>
	);
}
