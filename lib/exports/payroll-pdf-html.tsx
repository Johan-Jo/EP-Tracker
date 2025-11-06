/**
 * EPIC 33: HTML Template for Payroll PDF Generation
 * 
 * Generates HTML for Playwright/Puppeteer PDF rendering
 * Follows Swedish construction industry standards with A4 formatting
 */

import { PayrollPDFData } from './payroll-pdf-advanced';
import { maskPersonalNumber } from './payroll-pdf-advanced';

/**
 * Format hours as "X h Y min"
 */
function formatHours(hours: number | null | undefined): string {
	if (!hours || hours === 0) return '0 h';
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	if (m === 0) {
		return `${h} h`;
	}
	return `${h} h ${m} min`;
}

/**
 * Format SEK amount with Swedish number format
 */
function formatSEK(amount: number | null | undefined): string {
	if (amount === null || amount === undefined) return '0,00';
	const formatted = new Intl.NumberFormat('sv-SE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
	return formatted.replace(/\s/g, '\u202F'); // Narrow no-break space
}

/**
 * Format date as Swedish format: YYYY-MM-DD HH:mm
 */
function formatDateTime(dateString: string): string {
	try {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	} catch {
		return dateString;
	}
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	} catch {
		return dateString;
	}
}

/**
 * Generate HTML for payroll PDF
 */
export function generatePayrollPDFHTML(data: PayrollPDFData): string {
	const { organization, period_start, period_end, generated_at, version, export_target, attestation, employee, summary, wage_type_rows, project_breakdown, deviating_days, compliance_warnings } = data;
	
	const exportTargets = export_target === 'Both' ? ['Fortnox', 'Visma'] : [export_target];
	
	return `<!DOCTYPE html>
<html lang="sv">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Löneunderlag - ${employee.name}</title>
	<style>
		@page {
			size: A4;
			margin: 16mm 18mm;
		}
		
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		
		body {
			font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			font-size: 11px;
			line-height: 1.35;
			color: #111;
			background: white;
			font-variant-numeric: tabular-nums;
		}
		
		.prose-num {
			font-variant-numeric: tabular-nums;
		}
		
		.t-right {
			text-align: right;
		}
		
		.t-center {
			text-align: center;
		}
		
		.truncate-2 {
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		
		.badge {
			background: #F3F4F6;
			color: #444;
			border-radius: 9999px;
			padding: 6px 10px;
			font-weight: 600;
			font-size: 10px;
			text-transform: uppercase;
			display: inline-block;
		}
		
		/* Header */
		.header {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
			page-break-after: avoid;
		}
		
		.header-left h1 {
			font-size: 12px;
			font-weight: 600;
			color: #111;
			margin-bottom: 4px;
		}
		
		.header-left h2 {
			font-size: 20px;
			font-weight: 700;
			color: #111;
			white-space: nowrap;
		}
		
		.header-right {
			text-align: right;
			font-size: 10px;
			color: #555;
		}
		
		.header-right .period {
			margin-bottom: 4px;
		}
		
		.header-right .generated {
			margin-bottom: 4px;
		}
		
		.header-right .version {
			margin-bottom: 8px;
		}
		
		.header-right .badges {
			display: flex;
			gap: 6px;
			justify-content: flex-end;
		}
		
		/* Cards */
		.card {
			border-radius: 12px;
			border: 1px solid #E5E7EB;
			background: white;
			box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
			padding: 16px;
			margin-bottom: 16px;
			page-break-inside: avoid;
		}
		
		.card h3 {
			font-size: 12px;
			font-weight: 600;
			color: #111;
			margin-bottom: 12px;
		}
		
		.card-row {
			display: grid;
			grid-template-columns: 120px 1fr;
			gap: 12px;
			margin-bottom: 8px;
		}
		
		.card-label {
			font-weight: 500;
			color: #555;
		}
		
		.card-value {
			color: #111;
		}
		
		/* Summary Section */
		.summary {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
			page-break-inside: avoid;
		}
		
		.summary-column h3 {
			font-size: 12px;
			font-weight: 600;
			color: #111;
			margin-bottom: 12px;
		}
		
		.summary-row {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 12px;
			margin-bottom: 8px;
		}
		
		.summary-label {
			color: #111;
		}
		
		.summary-value {
			text-align: right;
			color: #111;
			font-variant-numeric: tabular-nums;
		}
		
		.summary-total {
			font-weight: 700;
			font-size: 13px;
			margin-top: 12px;
			padding-top: 12px;
			border-top: 1px solid #E5E7EB;
		}
		
		.summary-total .summary-value {
			font-size: 13px;
			font-weight: 600;
		}
		
		/* Table */
		.table-container {
			margin-bottom: 20px;
			page-break-inside: avoid;
		}
		
		table {
			table-layout: fixed;
			border-collapse: collapse;
			width: 100%;
			font-size: 11px;
		}
		
		thead {
			display: table-header-group;
		}
		
		th {
			font-weight: 600;
			font-size: 11px;
			color: #444;
			border-bottom: 1px solid #E5E7EB;
			padding: 8px 12px;
			background: white;
			text-align: left;
		}
		
		th.t-right {
			text-align: right;
		}
		
		th.t-center {
			text-align: center;
		}
		
		td {
			font-size: 11px;
			color: #111;
			border-bottom: 1px solid #F1F5F9;
			padding: 8px 12px;
			vertical-align: top;
			word-break: break-word;
		}
		
		td.t-right {
			text-align: right;
			white-space: nowrap;
			font-variant-numeric: tabular-nums;
		}
		
		td.t-center {
			text-align: center;
		}
		
		tr:nth-child(even) td {
			background: #FAFAFA;
		}
		
		tr, td, th {
			page-break-inside: avoid;
		}
		
		/* Column widths */
		.col-date { width: 22mm; }
		.col-project { width: 30mm; }
		.col-id06 { width: 24mm; }
		.col-employment { width: 18mm; }
		.col-source { width: 28mm; }
		.col-standby { width: 14mm; }
		.col-code { width: 24mm; }
		.col-wage-type { width: 42mm; }
		.col-quantity { width: 16mm; }
		.col-unit { width: 12mm; }
		.col-price { width: 18mm; }
		.col-amount { width: 22mm; }
		.col-account { width: 18mm; }
		.col-comment { width: 28mm; }
		.col-attest { width: 16mm; }
		.col-signature { width: 18mm; }
		
		/* Warning icon */
		.warning-icon {
			color: #C2410C;
			display: inline-block;
			margin-right: 4px;
		}
		
		/* Project breakdown */
		.project-breakdown {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 20px;
			margin-bottom: 20px;
			page-break-inside: avoid;
		}
		
		.project-breakdown h3 {
			font-size: 12px;
			font-weight: 600;
			color: #111;
			margin-bottom: 12px;
		}
		
		.project-item {
			margin-bottom: 8px;
			padding-bottom: 8px;
			border-bottom: 1px solid #F1F5F9;
		}
		
		.project-name {
			font-weight: 500;
			margin-bottom: 4px;
		}
		
		.project-details {
			font-size: 10px;
			color: #555;
			margin-left: 12px;
		}
		
		.project-total {
			text-align: right;
			font-weight: 600;
			margin-top: 4px;
		}
		
		/* Compliance checklist */
		.compliance-list {
			list-style: none;
			padding: 0;
		}
		
		.compliance-list li {
			margin-bottom: 8px;
			padding-left: 24px;
			position: relative;
		}
		
		.compliance-list li::before {
			content: "⚠︎";
			position: absolute;
			left: 0;
			color: #C2410C;
		}
		
		/* Footer */
		.footer {
			margin-top: 20px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 8px;
			color: #666;
			padding: 8px 0;
			border-top: 1px solid #E5E7EB;
		}
		
		/* Page break */
		.page-break {
			page-break-before: always;
		}
		
		section {
			break-inside: avoid;
		}
	</style>
</head>
<body>
	<!-- Header -->
	<div class="header">
		<div class="header-left">
			<h1>${organization.name || 'Okänt bolag'}</h1>
			<h2>Löneunderlag</h2>
		</div>
		<div class="header-right">
			<div class="period">Period: ${period_start} - ${period_end}</div>
			<div class="generated">Genererad: ${formatDateTime(generated_at)}</div>
			<div class="version">Version: ${version}</div>
			<div class="badges">
				${exportTargets.map(target => `<span class="badge">${target}</span>`).join('')}
			</div>
		</div>
	</div>
	
	<!-- Attestation Card -->
	<div class="card">
		<h3>Atteststatus</h3>
		${attestation.created_by ? `
		<div class="card-row">
			<div class="card-label">Skapad av:</div>
			<div class="card-value">${attestation.created_by.name} ${formatDateTime(attestation.created_by.timestamp)}</div>
		</div>
		` : ''}
		${attestation.reviewed_by ? `
		<div class="card-row">
			<div class="card-label">Granskad av:</div>
			<div class="card-value">${attestation.reviewed_by.name} ${formatDateTime(attestation.reviewed_by.timestamp)}</div>
		</div>
		` : ''}
		${attestation.attested_by ? `
		<div class="card-row">
			<div class="card-label">Attesterad av:</div>
			<div class="card-value">${attestation.attested_by.name} ${formatDateTime(attestation.attested_by.timestamp)}</div>
		</div>
		` : ''}
		<div class="card-row">
			<div class="card-label">Låsta:</div>
			<div class="card-value"><span class="badge">${attestation.locked ? 'Ja' : 'Nej'}</span></div>
		</div>
	</div>
	
	<!-- Employee Card -->
	<div class="card">
		<h3>Medarbetare</h3>
		<div class="card-row">
			<div class="card-label">Namn:</div>
			<div class="card-value">${employee.name}</div>
		</div>
		<div class="card-row">
			<div class="card-label">Personnummer:</div>
			<div class="card-value">${employee.personal_number ? maskPersonalNumber(employee.personal_number) : 'Ej angivet'}</div>
		</div>
		<div class="card-row">
			<div class="card-label">Anställningsform:</div>
			<div class="card-value">${employee.employment_type}</div>
		</div>
		${employee.hourly_rate_sek ? `
		<div class="card-row">
			<div class="card-label">Timlön:</div>
			<div class="card-value">${formatSEK(employee.hourly_rate_sek)} SEK/h</div>
		</div>
		` : ''}
		${employee.monthly_salary_sek ? `
		<div class="card-row">
			<div class="card-label">Månadslön:</div>
			<div class="card-value">${formatSEK(employee.monthly_salary_sek)} SEK</div>
		</div>
		` : ''}
		<div class="card-row">
			<div class="card-label">Avtal:</div>
			<div class="card-value">${employee.agreement}</div>
		</div>
	</div>
	
	<!-- Summary Section -->
	<div class="summary">
		<div class="summary-column">
			<h3>Timmar</h3>
			<div class="summary-row">
				<div class="summary-label">Ordinarie tid:</div>
				<div class="summary-value prose-num">${formatHours(summary.ordinary_hours)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Mertid:</div>
				<div class="summary-value prose-num">${formatHours(summary.part_time_hours)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Övertid Enkel:</div>
				<div class="summary-value prose-num">${formatHours(summary.overtime_simple)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Övertid Kvalificerad:</div>
				<div class="summary-value prose-num">${formatHours(summary.overtime_qualified)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">OB Kväll:</div>
				<div class="summary-value prose-num">${formatHours(summary.ob_evening)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">OB Natt:</div>
				<div class="summary-value prose-num">${formatHours(summary.ob_night)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">OB Helg:</div>
				<div class="summary-value prose-num">${formatHours(summary.ob_weekend)}</div>
			</div>
		</div>
		<div class="summary-column">
			<h3>Frånvaro</h3>
			<div class="summary-row">
				<div class="summary-label">Sjuk:</div>
				<div class="summary-value prose-num">${formatHours(summary.absence_sick)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">VAB:</div>
				<div class="summary-value prose-num">${formatHours(summary.absence_vab)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Semester:</div>
				<div class="summary-value prose-num">${formatHours(summary.absence_vacation)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Tjänstledig:</div>
				<div class="summary-value prose-num">${formatHours(summary.absence_leave)}</div>
			</div>
			<div class="summary-row">
				<div class="summary-label">Raster:</div>
				<div class="summary-value prose-num">${formatHours(summary.break_hours)}</div>
			</div>
		</div>
	</div>
	
	<!-- Total Summary -->
	<div class="summary-total">
		<div class="summary-row">
			<div class="summary-label">Total arbetad tid:</div>
			<div class="summary-value prose-num">${formatHours(summary.total_worked_hours)}</div>
		</div>
		<div class="summary-row">
			<div class="summary-label">Total bruttolön:</div>
			<div class="summary-value prose-num">${formatSEK(summary.total_gross_salary_sek)} SEK</div>
		</div>
	</div>
	
	<!-- Wage Type Rows Table -->
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th class="col-date">Datum</th>
					<th class="col-project">Projekt</th>
					<th class="col-id06 t-center">ID06</th>
					<th class="col-employment t-center">Anst.</th>
					<th class="col-source">Källa</th>
					<th class="col-standby t-center">B/J</th>
					<th class="col-code">Kod</th>
					<th class="col-wage-type">Löneart</th>
					<th class="col-quantity t-right">Antal</th>
					<th class="col-unit t-center">Enh</th>
					<th class="col-price t-right">À-pris</th>
					<th class="col-amount t-right">Belopp</th>
					<th class="col-account t-right">Konto</th>
					<th class="col-comment">Kommentar/Källa</th>
					<th class="col-attest t-center">Attest</th>
					<th class="col-signature t-center">Signatur</th>
				</tr>
			</thead>
			<tbody>
				${wage_type_rows.map((row, index) => {
					// Check if row has compliance warning
					const hasWarning = compliance_warnings.some(w => typeof w === 'string' ? false : w.affected_rows?.includes(index));
					return `
				<tr>
					<td class="prose-num">${formatDate(row.date)}</td>
					<td class="truncate-2">${(row.project_name || '–').substring(0, 30)}</td>
					<td class="t-center">${row.id06 || '–'}</td>
					<td class="t-center">${row.employment_type || '–'}</td>
					<td class="truncate-2">${(row.source || '–').substring(0, 25)}</td>
					<td class="t-center">${row.standby_oncall ? 'Ja' : 'Nej'}</td>
					<td>${row.wage_type_code}</td>
					<td class="truncate-2">${row.wage_type_name}</td>
					<td class="t-right prose-num">${row.quantity.toFixed(2)}</td>
					<td class="t-center">${row.unit}</td>
					<td class="t-right prose-num">${formatSEK(row.unit_price_sek)}</td>
					<td class="t-right prose-num">${formatSEK(row.amount_sek)}</td>
					<td class="t-right">${row.cost_center || '–'}</td>
					<td class="truncate-2">${(row.comment || '–').substring(0, 20)}</td>
					<td class="t-center">${row.attest_status}</td>
					<td class="t-center">${row.signature || '–'}</td>
				</tr>
				`;
				}).join('')}
			</tbody>
		</table>
	</div>
	
	<!-- Project Breakdown & Deviating Days -->
	<div class="project-breakdown">
		<div>
			<h3>Projekttuppdelning</h3>
			${project_breakdown.map(project => `
			<div class="project-item">
				<div class="project-name">${project.project_name || 'Okänt projekt'}</div>
				${project.wage_types.map(wt => `
				<div class="project-details">${wt.wage_type_name}: ${formatHours(wt.total_hours)} = ${formatSEK(wt.total_amount_sek)} SEK</div>
				`).join('')}
				<div class="project-total">Totalt: ${formatHours(project.total_hours)} = ${formatSEK(project.total_amount_sek)} SEK</div>
			</div>
			`).join('')}
		</div>
		<div>
			<h3>Top 5 avvikande dagar</h3>
			${deviating_days.slice(0, 5).map(day => `
			<div class="project-item">
				<div class="project-name">${formatDate(day.date)}</div>
				<div class="project-details">${formatHours(day.hours)} - ${day.reason}</div>
			</div>
			`).join('')}
			${deviating_days.length === 0 ? '<div class="project-item">Inga avvikelser hittades</div>' : ''}
		</div>
	</div>
	
	<!-- Compliance Checklist -->
	${compliance_warnings.length > 0 ? `
	<div class="card">
		<h3>Kontrollista (Avvikelser)</h3>
		<ul class="compliance-list">
			${compliance_warnings.map(warning => `<li>${warning}</li>`).join('')}
		</ul>
	</div>
	` : ''}
	
	<!-- Footer -->
	<div class="footer">
		<div>Loneunderlag_${period_start}_${period_end}_${employee.name.replace(/\s+/g, '_')}.pdf</div>
		<div class="prose-num">Sida <span class="page-number"></span></div>
	</div>
</body>
</html>`;
}

