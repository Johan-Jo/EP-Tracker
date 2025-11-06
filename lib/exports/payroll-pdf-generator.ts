/**
 * EPIC 33: Advanced Payroll PDF Generator (Playwright-based)
 * 
 * Generates professional payroll basis PDF according to Swedish construction industry standards
 * Uses Playwright to render React component → HTML → PDF with proper A4 formatting
 */

import {
	PayrollPDFData,
	maskPersonalNumber,
	collectPayrollPDFData,
} from '@/lib/exports/payroll-pdf-advanced';

/**
 * Generate advanced payroll PDF document using Playwright
 */
export async function generateAdvancedPayrollPDF(
	orgId: string,
	personId: string,
	periodStart: string,
	periodEnd: string,
	exportTarget: 'Fortnox PAXml' | 'Visma Lön' | 'Both' = 'Both'
): Promise<Buffer> {
	// Collect all data needed for PDF
	const data = await collectPayrollPDFData(orgId, personId, periodStart, periodEnd, exportTarget);
	
	// Transform data to component props
	const props = transformToComponentProps(data, periodStart, periodEnd);
	
	// Dynamically import React rendering to avoid Next.js 15 build issues
	const { renderToStaticMarkup } = await import('react-dom/server');
	const React = await import('react');
	const PayrollPdfModule = await import('@/components/PayrollPdf');
	const PayrollPdf = PayrollPdfModule.default;
	
	// Render React component to HTML
	const html = renderToStaticMarkup(React.createElement(PayrollPdf, props));
	
	// Debug: Log HTML length to verify rendering
	console.log('Generated HTML length:', html.length);
	console.log('Rows count:', props.rows.length);
	console.log('Totals:', props.totals);
	
	// Use Playwright to generate PDF
	try {
		const { chromium } = await import('playwright');
		const browser = await chromium.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});
		
		const page = await browser.newPage();
		
		// Set content
		await page.setContent(html, {
			waitUntil: 'networkidle',
		});
		
		// Emulate print media type
		await page.emulateMedia({ media: 'print' });
		
		// Wait for fonts to load
		await page.evaluate(() => document.fonts.ready);
		
		// Wait a bit more for rendering
		await page.waitForTimeout(500);
		
		// Generate PDF with page numbers in footer
		const fileName = `Loneunderlag_${periodStart}_${periodEnd}_${data.employee.name.replace(/\s+/g, '_')}.pdf`;
		const pdfBuffer = await page.pdf({
			format: 'A4',
			margin: {
				top: '16mm',
				right: '18mm',
				bottom: '16mm',
				left: '18mm',
			},
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false, // Using component's own footer
		});
		
		await browser.close();
		
		console.log('PDF generated successfully with Playwright, size:', pdfBuffer.length);
		return Buffer.from(pdfBuffer);
	} catch (error) {
		console.error('Error generating PDF with Playwright:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		// Fallback to pdfkit if Playwright fails
		console.log('Falling back to pdfkit...');
		return generatePayrollPDFWithPDFKit(data);
	}
}

/**
 * Transform PayrollPDFData to PayrollPdf component props
 */
function transformToComponentProps(
	data: PayrollPDFData,
	periodStart: string,
	periodEnd: string
) {
	// Format date/time helpers
	const formatDateTime = (dateString: string): string => {
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
	};

	const formatDate = (dateString: string): string => {
		try {
			const date = new Date(dateString);
			return date.toISOString().split('T')[0];
		} catch {
			return dateString;
		}
	};

	// Transform wage type rows
	const rows = data.wage_type_rows.map((row, index) => {
		// Check if row has compliance warning
		const hasWarning = data.compliance_warnings.some(w => 
			typeof w === 'string' ? false : w.affected_rows?.includes(index)
		);
		
		return {
			date: formatDate(row.date),
			project: row.project_name || '–',
			id06: row.id06 || undefined,
			employmentType: (row.employment_type as "Anställd" | "UE" | "-") || undefined,
			source: row.source || undefined,
			standbyOrCall: row.standby_oncall ? "Beredskap" as const : undefined,
			code: row.wage_type_code,
			wageItem: row.wage_type_name,
			qty: row.quantity,
			unit: row.unit as "h" | "st" | "km" | "dygn",
			unitPrice: row.unit_price_sek,
			amount: row.amount_sek,
			account: row.cost_center || undefined,
			hasWarning,
		};
	});

	// Transform project subtotals
	const projectSubtotals = data.project_breakdown.map(project => ({
		project: project.project_name || 'Okänt projekt',
		sumOrd: 0, // TODO: Calculate from wage types
		sumOTKval: 0, // TODO: Calculate from wage types
		sumOBStor: 0, // TODO: Calculate from wage types
		sumAll: project.total_amount_sek || 0,
	}));

	// Transform deviating days
	const topDeviations = data.deviating_days.map(day => ({
		date: formatDate(day.date),
		hours: day.hours,
	}));

	// Transform compliance warnings
	const issues = data.compliance_warnings.map(warning => 
		typeof warning === 'string' ? warning : warning.description || 'Okänd avvikelse'
	);

	// Build export targets
	const targets: ("Fortnox" | "Visma")[] = [];
	if (data.export_target === 'Both' || data.export_target === 'Fortnox PAXml') {
		targets.push('Fortnox');
	}
	if (data.export_target === 'Both' || data.export_target === 'Visma Lön') {
		targets.push('Visma');
	}

	return {
		meta: {
			company: data.organization.name,
			periodFrom: periodStart,
			periodTo: periodEnd,
			generatedAt: formatDateTime(data.generated_at),
			version: data.version,
			locks: data.attestation.locked,
			createdBy: data.attestation.created_by 
				? `${data.attestation.created_by.name} ${formatDateTime(data.attestation.created_by.timestamp)}`
				: 'System',
			approvedBy: data.attestation.attested_by
				? `${data.attestation.attested_by.name} ${formatDateTime(data.attestation.attested_by.timestamp)}`
				: undefined,
			targets,
			fileName: `Loneunderlag_${periodStart}_${periodEnd}_${data.employee.name.replace(/\s+/g, '_')}.pdf`,
		},
		employee: {
			name: data.employee.name,
			ssnMasked: data.employee.personal_number ? maskPersonalNumber(data.employee.personal_number) : undefined,
			employmentForm: data.employee.employment_type,
			hourly: data.employee.hourly_rate_sek || undefined,
			agreement: data.employee.agreement,
		},
		totals: {
			ord: data.summary.ordinary_hours || 0,
			mertid: data.summary.part_time_hours || 0,
			otEnkel: data.summary.overtime_simple || 0,
			otKval: data.summary.overtime_qualified || 0,
			obKv: data.summary.ob_evening || 0,
			obNatt: data.summary.ob_night || 0,
			obHelg: data.summary.ob_weekend || 0,
			sick: data.summary.absence_sick || 0,
			vab: data.summary.absence_vab || 0,
			vacation: data.summary.absence_vacation || 0,
			leave: data.summary.absence_leave || 0,
			breaks: data.summary.break_hours || 0,
			worked: data.summary.total_worked_hours || 0,
			gross: data.summary.total_gross_salary_sek || 0,
		},
		rows,
		projectSubtotals,
		topDeviations,
		issues,
	};
}

/**
 * Fallback PDF generation using pdfkit (if Playwright fails)
 */
function generatePayrollPDFWithPDFKit(data: PayrollPDFData): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const PDFDocument = require('pdfkit');
			const doc = new PDFDocument({
				size: 'A4',
				margins: { top: 50, bottom: 50, left: 50, right: 50 },
			});

			const buffers: Buffer[] = [];

			doc.on('data', (chunk: Buffer) => {
				buffers.push(chunk);
			});
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(buffers);
				resolve(pdfBuffer);
			});
			doc.on('error', (error: Error) => {
				console.error('PDFDocument error:', error);
				reject(error);
			});

			// Basic fallback rendering
			doc.fontSize(12).text('Löneunderlag', 50, 50);
			doc.fontSize(10).text(`Period: ${data.period_start} - ${data.period_end}`, 50, 70);
			doc.text(`Medarbetare: ${data.employee.name}`, 50, 90);
			
			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}
