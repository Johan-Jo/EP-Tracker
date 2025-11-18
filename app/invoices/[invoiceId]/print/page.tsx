import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// Server-rendered print view for a single invoice (invoice_basis record)

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface InvoicePrintPageProps {
	params: Promise<{ invoiceId: string }>;
}

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
	const { invoiceId } = await params;
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/dashboard');
	}

	const supabase = await createClient();

	// Load invoice_basis by id for current org
	const { data: invoiceBasis, error: invoiceError } = await supabase
		.from('invoice_basis')
		.select('*')
		.eq('org_id', membership.org_id)
		.eq('id', invoiceId)
		.single();

	if (invoiceError || !invoiceBasis) {
		redirect('/dashboard');
	}

	// Load organization info (including logo & payment data)
	const { data: organization } = await supabase
		.from('organizations')
		.select(
			'name, org_number, phone, address, postal_code, city, bankgiro, plusgiro, iban, bic, logo_url, vat_number, vat_registered'
		)
		.eq('id', membership.org_id)
		.single();

	// Load project for label
	const { data: project } = await supabase
		.from('projects')
		.select('name, project_number')
		.eq('id', invoiceBasis.project_id)
		.single();

	const customerAddress =
		invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object'
			? (invoiceBasis.invoice_address_json as Record<string, any>)
			: null;

	const deliveryAddress =
		invoiceBasis.delivery_address_json && typeof invoiceBasis.delivery_address_json === 'object'
			? (invoiceBasis.delivery_address_json as Record<string, any>)
			: null;

	const lines = (invoiceBasis.lines_json?.lines ?? []) as Array<any>;
	const diary = (invoiceBasis.lines_json?.diary ?? []) as Array<{
		date: string;
		summary: string;
	}>;

	const nonDiaryLines = lines.filter((line: any) => line.type !== 'diary');

	// Separate lines by type
	const timeLines = nonDiaryLines.filter((line: any) => line.type === 'time');
	const materialLines = nonDiaryLines.filter((line: any) => line.type === 'material');
	const expenseLines = nonDiaryLines.filter((line: any) => line.type === 'expense');
	const otherLines = nonDiaryLines.filter(
		(line: any) => line.type !== 'time' && line.type !== 'material' && line.type !== 'expense'
	);

	// Calculate line amounts
	const calculateLineAmounts = (line: any) => {
		const quantity = line.quantity ?? 0;
		const unitPrice = line.unit_price ?? 0;
		const discount = line.discount ?? 0;
		const vatRate = line.vat_rate ?? 0;
		const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
		const amountExclVAT = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
		const amountVAT = Math.round((amountExclVAT * vatRate) / 100 * 100) / 100;
		const amountInclVAT = Math.round((amountExclVAT + amountVAT) * 100) / 100;
		return { amountExclVAT, amountVAT, amountInclVAT };
	};

	// Calculate totals
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

	const formatCurrency = (amount: number | null | undefined) =>
		(amount ?? 0).toLocaleString('sv-SE', {
			style: 'currency',
			currency: invoiceBasis.currency || 'SEK',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const formatNumber = (amount: number | null | undefined, decimals = 2) =>
		(amount ?? 0).toLocaleString('sv-SE', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});

	const formatDate = (value: string | null) =>
		value ? new Date(value).toLocaleDateString('sv-SE') : '';

	const formatQuantity = (value: number) => formatNumber(value, 2);

	const totals = invoiceBasis.totals as
		| {
				currency: string;
				total_ex_vat: number;
				total_vat: number;
				total_inc_vat: number;
				per_vat_rate: Record<string, { base: number; vat: number; total: number }>;
		  }
		| null;

	return (
		<html lang="sv">
			<head>
				<title>Faktura – {organization?.name ?? 'EP Tracker'}</title>
				<style
					// Basic print styles for margins and background
					dangerouslySetInnerHTML={{
						__html: `
@page {
  margin: 20mm 15mm;
}
body {
  background: #ffffff;
}
`,
					}}
				/>
			</head>
			<body className="bg-slate-100 text-neutral-900 antialiased print:bg-white">
				<div className="mx-auto my-8 max-w-4xl rounded-xl bg-white p-8 shadow print:m-0 print:max-w-none print:rounded-none print:shadow-none">
					{/* Header */}
					<header className="flex items-start justify-between gap-8">
						<div className="flex flex-col">
							{organization?.logo_url ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={organization.logo_url}
									alt={organization.name ?? 'Företagslogotyp'}
									className="h-16 w-auto max-w-[160px] object-contain"
								/>
							) : (
								<div className="text-xl font-bold">{organization?.name}</div>
							)}
							{organization?.address && (
								<p className="mt-4 text-xs text-neutral-600">
									{organization.address}
									{organization.postal_code && organization.city && (
										<>
											<br />
											{organization.postal_code} {organization.city}
										</>
									)}
								</p>
							)}
						</div>
						<div className="text-right">
							<h1 className="text-2xl font-bold tracking-wide">FAKTURA</h1>
							<div className="mt-4 space-y-1 text-xs text-neutral-700">
								{invoiceBasis.invoice_number && (
									<p>
										<span className="font-semibold">Fakturanummer:</span>{' '}
										{invoiceBasis.invoice_series
											? `${invoiceBasis.invoice_series} ${invoiceBasis.invoice_number}`
											: invoiceBasis.invoice_number}
									</p>
								)}
								{invoiceBasis.invoice_date && (
									<p>
										<span className="font-semibold">Fakturadatum:</span>{' '}
										{formatDate(invoiceBasis.invoice_date)}
									</p>
								)}
								{invoiceBasis.due_date && (
									<p>
										<span className="font-semibold">Förfallodatum:</span>{' '}
										{formatDate(invoiceBasis.due_date)}
									</p>
								)}
								<p>
									<span className="font-semibold">Betalvillkor:</span>{' '}
									{invoiceBasis.payment_terms_days ?? 30} dagar
								</p>
							</div>
						</div>
					</header>

					{/* Seller / Buyer */}
					<section className="mt-8 grid grid-cols-1 gap-8 text-xs text-neutral-800 md:grid-cols-2">
						<div>
							<h2 className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">Säljare</h2>
							<p className="font-semibold">{organization?.name}</p>
							{organization?.address && <p>{organization.address}</p>}
							{organization?.postal_code && organization?.city && (
								<p>
									{organization.postal_code} {organization.city}
								</p>
							)}
							{organization?.org_number && <p>Org.nr: {organization.org_number}</p>}
							{organization?.vat_number && <p>Momsreg.nr: {organization.vat_number}</p>}
						</div>
						<div>
							<h2 className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">Kund</h2>
							{customerAddress && (
								<>
									{customerAddress.name && (
										<p className="font-semibold">{String(customerAddress.name)}</p>
									)}
									{customerAddress.street && <p>{String(customerAddress.street)}</p>}
									{customerAddress.zip && customerAddress.city && (
										<p>
											{customerAddress.zip} {customerAddress.city}
										</p>
									)}
									{customerAddress.country && <p>{String(customerAddress.country)}</p>}
									{customerAddress.org_no && (
										<p>Org.nr: {String(customerAddress.org_no)}</p>
									)}
								</>
							)}
						</div>
					</section>

					{/* Overview */}
					<section className="mt-8 border-t border-neutral-200 pt-4 text-xs text-neutral-800">
						<h2 className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">
							Fakturaöversikt
						</h2>
						<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
							<div>
								<p>
									<span className="font-semibold">Projekt:</span>{' '}
									{project?.project_number
										? `${project.project_number} – ${project.name}`
										: project?.name}
								</p>
								<p>
									<span className="font-semibold">Period:</span>{' '}
									{formatDate(invoiceBasis.period_start)} –{' '}
									{formatDate(invoiceBasis.period_end)}
								</p>
							</div>
							<div>
								{invoiceBasis.our_ref && (
									<p>
										<span className="font-semibold">Vår referens:</span>{' '}
										{invoiceBasis.our_ref}
									</p>
								)}
								{invoiceBasis.your_ref && (
									<p>
										<span className="font-semibold">Er referens:</span>{' '}
										{invoiceBasis.your_ref}
									</p>
								)}
								{deliveryAddress && deliveryAddress.name && (
									<p>
										<span className="font-semibold">Leveransadress:</span>{' '}
										{String(deliveryAddress.name)}
									</p>
								)}
							</div>
						</div>
					</section>

					{/* Tidblock Section */}
					{timeLines.length > 0 && (
						<section className="mt-8 text-xs">
							<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
								Tidblock
							</h3>
							<table className="w-full border-collapse text-left">
								<thead className="border-b border-neutral-300 bg-neutral-50">
									<tr>
										<th className="py-2 pr-2 font-semibold">Datum</th>
										<th className="py-2 pr-2 font-semibold">Person</th>
										<th className="py-2 pr-2 font-semibold">Dagbok</th>
										<th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
											Timmar
										</th>
										<th className="py-2 pl-2 text-right font-semibold whitespace-nowrap">
											Summa ex moms
										</th>
									</tr>
								</thead>
								<tbody>
									{timeLines.map((line: any) => {
										const { amountExclVAT } = calculateLineAmounts(line);
										return (
											<tr key={line.id} className="border-b border-neutral-100 align-top">
												<td className="py-1.5 pr-2">
													{line.date ? formatDate(line.date) : '–'}
												</td>
												<td className="py-1.5 pr-2 whitespace-nowrap">
													{line.person || '–'}
												</td>
												<td className="py-1.5 pr-2 text-[10px] text-neutral-600">
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
								<tfoot className="bg-neutral-50 border-t-2 border-neutral-300">
									<tr className="text-xs font-semibold">
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
						<section className="mt-8 text-xs">
							<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
								Material
							</h3>
							<table className="w-full border-collapse text-left">
								<thead className="border-b border-neutral-300 bg-neutral-50">
									<tr>
										<th className="py-2 pr-2 font-semibold">Datum</th>
										<th className="py-2 pr-2 font-semibold">Beskrivning</th>
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
									{materialLines.map((line: any) => {
										const { amountExclVAT } = calculateLineAmounts(line);
										return (
											<tr key={line.id} className="border-b border-neutral-100 align-top">
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
								<tfoot className="bg-neutral-50 border-t-2 border-neutral-300">
									<tr className="text-xs font-semibold">
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
						<section className="mt-8 text-xs">
							<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
								Utlägg
							</h3>
							<table className="w-full border-collapse text-left">
								<thead className="border-b border-neutral-300 bg-neutral-50">
									<tr>
										<th className="py-2 pr-2 font-semibold">Datum</th>
										<th className="py-2 pr-2 font-semibold">Beskrivning</th>
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
									{expenseLines.map((line: any) => {
										const { amountExclVAT } = calculateLineAmounts(line);
										return (
											<tr key={line.id} className="border-b border-neutral-100 align-top">
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
								<tfoot className="bg-neutral-50 border-t-2 border-neutral-300">
									<tr className="text-xs font-semibold">
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
						<section className="mt-8 text-xs">
							<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
								Övrigt
							</h3>
							<table className="w-full border-collapse text-left">
								<thead className="border-b border-neutral-300 bg-neutral-50">
									<tr>
										<th className="py-2 pr-2 font-semibold">Datum</th>
										<th className="py-2 pr-2 font-semibold">Beskrivning</th>
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
									{otherLines.map((line: any) => {
										const { amountExclVAT } = calculateLineAmounts(line);
										return (
											<tr key={line.id} className="border-b border-neutral-100 align-top">
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
								<tfoot className="bg-neutral-50 border-t-2 border-neutral-300">
									<tr className="text-xs font-semibold">
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
						<section className="mt-8 text-xs">
							<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
								Summeringar
							</h3>
							<div className="space-y-4">
								{/* Main totals grid */}
								<div className="grid grid-cols-3 gap-4">
									<div className="rounded-md border border-emerald-300 bg-emerald-50/70 px-3 py-2">
										<div className="text-[10px] uppercase text-emerald-600">
											Netto exkl. moms
										</div>
										<div className="text-sm font-semibold text-neutral-900">
											{formatCurrency(totals.total_ex_vat)}
										</div>
									</div>
									<div className="rounded-md border border-amber-300 bg-amber-50/70 px-3 py-2">
										<div className="text-[10px] uppercase text-amber-600">Moms</div>
										<div className="text-sm font-semibold text-neutral-900">
											{formatCurrency(totals.total_vat)}
										</div>
									</div>
									<div className="rounded-md border border-blue-300 bg-blue-50/70 px-3 py-2">
										<div className="text-[10px] uppercase text-blue-600">Totalt</div>
										<div className="text-sm font-semibold text-neutral-900">
											{formatCurrency(totals.total_inc_vat)}
										</div>
									</div>
								</div>

								{/* VAT per rate */}
								{totals.per_vat_rate &&
									Object.entries(totals.per_vat_rate).some(
										([, vatData]) => vatData.base > 0
									) && (
										<div className="rounded-md border border-neutral-200 bg-neutral-50/70 px-3 py-2">
											{Object.entries(totals.per_vat_rate).map(([rate, values]) => {
												if (values.base <= 0) return null;
												const vatRate = parseFloat(rate);
												return (
													<div key={rate} className="mb-2 last:mb-0">
														<div className="text-[10px] font-semibold uppercase text-neutral-600">
															Moms {vatRate}%
														</div>
														<div className="text-[10px] text-neutral-700">
															Exkl: {formatCurrency(values.base)}
														</div>
														<div className="text-[10px] text-neutral-700">
															Moms: {formatCurrency(values.vat)}
														</div>
														<div className="text-[10px] text-neutral-700">
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

					{/* Payment information */}
					<section className="mt-10 text-xs">
						<h2 className="mb-1 text-[11px] font-semibold uppercase text-neutral-500">
							Betalningsinformation
						</h2>
						<div className="space-y-0.5 text-neutral-700">
							{organization?.bankgiro && (
								<p>Bankgiro: {organization.bankgiro}</p>
							)}
							{organization?.plusgiro && (
								<p>Plusgiro: {organization.plusgiro}</p>
							)}
							{organization?.iban && <p>IBAN: {organization.iban}</p>}
							{organization?.bic && <p>BIC/SWIFT: {organization.bic}</p>}
							<p>Ange fakturanummer som referens vid betalning.</p>
						</div>
					</section>

					{/* Footer */}
					<footer className="mt-10 border-t border-neutral-200 pt-2 text-center text-[10px] text-neutral-500">
						{organization && (
							<p>
								{organization.name}
								{organization.org_number && ` – Org.nr ${organization.org_number}`}
								{organization.city && ` – Säte: ${organization.city}`}
							</p>
						)}
					</footer>
				</div>
			</body>
		</html>
	);
}


