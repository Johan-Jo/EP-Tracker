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

					{/* Line table */}
					<section className="mt-8 text-xs">
						<table className="w-full border-collapse text-left">
							<thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wide text-neutral-600">
								<tr>
									<th className="py-2 pr-2">Beskrivning</th>
									<th className="py-2 pr-2 text-right">Antal</th>
									<th className="py-2 pr-2 text-center">Enhet</th>
									<th className="py-2 pr-2 text-right">Á-pris</th>
									<th className="py-2 pr-2 text-right">Moms %</th>
									<th className="py-2 text-right">Belopp exkl. moms</th>
								</tr>
							</thead>
							<tbody>
								{lines
									.filter((line) => line.type !== 'diary')
									.map((line) => {
										const quantity = line.quantity ?? 0;
										const unitPrice = line.unit_price ?? 0;
										const vatRate = line.vat_rate ?? 0;
										const discount = line.discount ?? 0;
										const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
										const exVat = quantity * unitPrice * discountFactor;

										return (
											<tr key={line.id} className="border-b border-neutral-100">
												<td className="py-1.5 pr-2 align-top">
													<span className="font-medium">
														{line.type === 'time'
															? 'Tid'
															: line.type === 'material'
															? 'Material'
															: line.type === 'expense'
															? 'Utlägg'
															: line.type === 'mileage'
															? 'Mil'
															: line.type === 'ata'
															? 'ÄTA'
															: line.type}
														:{' '}
													</span>
													<span>{line.description}</span>
												</td>
												<td className="py-1.5 pr-2 text-right align-top">
													{formatNumber(quantity)}
												</td>
												<td className="py-1.5 pr-2 text-center align-top">
													{line.unit || ''}
												</td>
												<td className="py-1.5 pr-2 text-right align-top">
													{formatCurrency(unitPrice)}
												</td>
												<td className="py-1.5 pr-2 text-right align-top">
													{formatNumber(vatRate, 0)} %
												</td>
												<td className="py-1.5 text-right align-top">
													{formatCurrency(Math.round(exVat * 100) / 100)}
												</td>
											</tr>
										);
									})}
							</tbody>
						</table>
					</section>

					{/* Diary */}
					{diary.length > 0 && (
						<section className="mt-10 text-xs">
							<h2 className="mb-2 font-semibold">Fakturatext – Dagbok</h2>
							<div className="space-y-1 text-neutral-700">
								{diary.map((entry) => (
									<p key={entry.line_ref}>
										{entry.date.slice(0, 10)} – {entry.summary}
									</p>
								))}
							</div>
						</section>
					)}

					{/* Totals + payment */}
					<section className="mt-10 grid grid-cols-1 gap-8 text-xs md:grid-cols-[2fr_1.5fr]">
						<div>
							<h2 className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">
								Betalningsinformation
							</h2>
							<div className="space-y-1 text-neutral-700">
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
						</div>

						<div className="space-y-2">
							{totals?.per_vat_rate && (
								<div className="rounded border border-neutral-200 p-3">
									<p className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">
										Momsöversikt
									</p>
									<div className="space-y-1">
										{Object.entries(totals.per_vat_rate).map(([rate, data]) =>
											data.base > 0 ? (
												<div
													key={rate}
													className="flex items-center justify-between text-neutral-700"
												>
													<span className="text-xs">
														Exkl. moms ({rate}%)
													</span>
													<span className="text-xs">
														{formatCurrency(data.base)}
													</span>
												</div>
											) : null
										)}
									</div>
								</div>
							)}

							{totals && (
								<div className="rounded border border-neutral-200 p-3">
									<div className="flex items-center justify-between text-xs text-neutral-800">
										<span>Summa exkl. moms:</span>
										<span className="font-medium">
											{formatCurrency(totals.total_ex_vat)}
										</span>
									</div>
									<div className="mt-1 flex items-center justify-between text-xs text-neutral-800">
										<span>Summa moms:</span>
										<span className="font-medium">
											{formatCurrency(totals.total_vat)}
										</span>
									</div>
									<div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-semibold">
										<span>Att betala (inkl. moms):</span>
										<span>{formatCurrency(totals.total_inc_vat)}</span>
									</div>
								</div>
							)}
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


