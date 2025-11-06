import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
// PDFDocument will be imported dynamically in generatePayrollPDF to avoid bundling issues

// Force Node.js runtime for PDF generation (pdfkit requires Node.js)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll/basis/export
 * 
 * Export payroll basis data as CSV or PDF
 * 
 * Query params:
 * - start: period start date (YYYY-MM-DD)
 * - end: period end date (YYYY-MM-DD)
 * - format: 'csv' or 'pdf' (default: 'csv')
 * - person_id: optional person ID to filter
 * - locked_only: boolean (default: false) - only export locked entries
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can export payroll basis
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const periodStart = searchParams.get('start');
		const periodEnd = searchParams.get('end');
		const format = searchParams.get('format') || 'csv';
		const personId = searchParams.get('person_id');
		const lockedOnly = searchParams.get('locked_only') === 'true';

		if (!periodStart || !periodEnd) {
			return NextResponse.json(
				{ error: 'start and end parameters are required (YYYY-MM-DD)' },
				{ status: 400 }
			);
		}

		if (format !== 'csv' && format !== 'pdf') {
			return NextResponse.json(
				{ error: 'format must be "csv" or "pdf"' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Build query for payroll_basis
		let query = supabase
			.from('payroll_basis')
			.select(`
				*,
				person:profiles!payroll_basis_person_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.gte('period_end', periodStart)
			.lte('period_start', periodEnd)
			.order('period_start', { ascending: false })
			.order('person_id', { ascending: true });

		// Filter by person if specified
		if (personId) {
			query = query.eq('person_id', personId);
		}

		// Filter by locked status if requested
		if (lockedOnly) {
			query = query.eq('locked', true);
		}

		const { data: payrollBasis, error } = await query;

		if (error) {
			console.error('Error fetching payroll basis for export:', error);
			return NextResponse.json({ error: 'Failed to fetch payroll basis' }, { status: 500 });
		}

		if (!payrollBasis || payrollBasis.length === 0) {
			return NextResponse.json(
				{ error: 'No payroll basis data found for the specified period' },
				{ status: 404 }
			);
		}

		// Generate export based on format
		if (format === 'csv') {
			// CSV export - uses same structure as PDF with wage type rows
			const csv = await generatePayrollCSV(
				payrollBasis,
				membership.org_id,
				periodStart,
				periodEnd,
				lockedOnly
			);
			const filename = `loneunderlag_${periodStart}_${periodEnd}.csv`;

			return new NextResponse(csv, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${filename}"`,
				},
			});
		} else {
			// PDF export - always use advanced PDF generator
			try {
				const { generateAdvancedPayrollPDF } = await import('@/lib/exports/payroll-pdf-generator');
				const exportTarget = searchParams.get('export_target') as 'Fortnox PAXml' | 'Visma Lön' | 'Both' || 'Both';
				
				// Determine which person to generate PDF for
				const targetPersonId = personId || (payrollBasis && payrollBasis.length > 0 ? payrollBasis[0]?.person_id : null);
				
				if (!targetPersonId) {
					return NextResponse.json(
						{ error: 'No person ID specified and no payroll basis data found' },
						{ status: 400 }
					);
				}
				
				const pdfBuffer = await generateAdvancedPayrollPDF(
					membership.org_id,
					targetPersonId,
					periodStart,
					periodEnd,
					exportTarget
				);
				
				const personName = payrollBasis?.find((p: any) => p.person_id === targetPersonId)?.person?.full_name || 
					payrollBasis?.[0]?.person?.full_name || 'medarbetare';
				const filename = `loneunderlag_${periodStart}_${periodEnd}_${personName.replace(/\s+/g, '_')}.pdf`;

				return new NextResponse(pdfBuffer, {
					headers: {
						'Content-Type': 'application/pdf',
						'Content-Disposition': `attachment; filename="${filename}"`,
						'Content-Length': pdfBuffer.length.toString(),
					},
				});
			} catch (pdfError) {
				console.error('Error generating PDF:', pdfError);
				const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
				console.error('PDF generation error details:', errorMessage);
				return NextResponse.json(
					{ error: `Failed to generate PDF: ${errorMessage}` },
					{ status: 500 }
				);
			}
		}
	} catch (error) {
		console.error('Error in GET /api/payroll/basis/export:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Generate CSV content for payroll basis export
 * Matches PDF structure with wage type rows (löneart-rader)
 */
async function generatePayrollCSV(
	data: any[],
	orgId: string,
	periodStart: string,
	periodEnd: string,
	lockedOnly: boolean
): Promise<string> {
	// CSV Header - matches PDF table structure
	const headers = [
		'Datum',
		'Projekt/Arbetsorder',
		'ID06',
		'Anställningstyp',
		'Källa',
		'Beredskap/Jour',
		'Löneartkod',
		'Löneartnamn',
		'Antal',
		'Enhet',
		'À-pris (SEK)',
		'Belopp (SEK)',
		'Konto/Kostnadsställe',
		'Kommentar/Källa',
		'Attest',
		'Signatur',
	];

	// Generate wage type rows for each person
	const allRows: string[][] = [];
	
	for (const entry of data) {
		// Only process locked entries if lockedOnly is true
		if (lockedOnly && !entry.locked) {
			continue;
		}
		
		const personId = entry.person_id;
		if (!personId) continue;
		
		// Generate wage type rows for this person
		const { generateWageTypeRows } = await import('@/lib/exports/payroll-pdf-advanced');
		const wageTypeRows = await generateWageTypeRows(orgId, personId, periodStart, periodEnd);
		
		// Convert wage type rows to CSV rows
		wageTypeRows.forEach((row) => {
			allRows.push([
				formatDate(row.date),
				escapeCSV(row.project_name || ''),
				escapeCSV(row.id06 || ''),
				escapeCSV(row.employment_type || ''),
				escapeCSV(row.source || ''),
				row.standby_oncall ? 'Ja' : 'Nej',
				escapeCSV(row.wage_type_code),
				escapeCSV(row.wage_type_name),
				row.quantity.toFixed(2),
				row.unit,
				row.unit_price_sek.toFixed(2),
				row.amount_sek.toFixed(2),
				escapeCSV(row.cost_center || ''),
				escapeCSV(row.comment),
				row.attest_status,
				escapeCSV(row.signature),
			]);
		});
	}

	// Combine header and rows
	const csvLines = [headers.join(';')].concat(allRows.map((row) => row.join(';')));

	// Add BOM for UTF-8 Excel compatibility (semicolon separator for Swedish Excel)
	return '\uFEFF' + csvLines.join('\n');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
	if (value === null || value === undefined) {
		return '';
	}

	const stringValue = String(value);

	// If value contains comma, quote, or newline, wrap in quotes and escape quotes
	if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}

	return stringValue;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	} catch {
		return dateString;
	}
}

/**
 * Format date for display (Swedish format: YYYY-MM-DD)
 */
function formatDateDisplay(dateString: string): string {
	try {
		const date = new Date(dateString);
		return date.toLocaleDateString('sv-SE');
	} catch {
		return dateString;
	}
}

/**
 * Format hours for display (e.g., "40h 30min")
 */
function formatHours(hours: number): string {
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	if (m === 0) {
		return `${h}h`;
	}
	return `${h}h ${m}min`;
}

/**
 * Generate PDF document for payroll basis export
 */
async function generatePayrollPDF(
	data: any[],
	periodStart: string,
	periodEnd: string
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			// Import PDFDocument dynamically to avoid issues with Next.js bundling
			const PDFDocument = require('pdfkit');
			const doc = new PDFDocument({
				size: 'A4',
				margins: { top: 50, bottom: 50, left: 50, right: 50 },
			});

			const buffers: Buffer[] = [];
			let totalPages = 1; // Track total pages

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
			doc.on('pageAdded', () => {
				totalPages++;
			});

			// Header
			doc.fontSize(20).font('Helvetica-Bold').text('Löneunderlag', { align: 'center' });
			doc.moveDown(0.5);
			doc
				.fontSize(12)
				.font('Helvetica')
				.text(
					`Period: ${formatDateDisplay(periodStart)} - ${formatDateDisplay(periodEnd)}`,
					{ align: 'center' }
				);
			doc.moveDown(0.5);
			doc
				.fontSize(10)
				.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, { align: 'center' });
			doc.moveDown(1);

			// Calculate totals
			const totals = {
				hoursNorm: 0,
				hoursOvertime: 0,
				obHours: 0,
				breakHours: 0,
				totalHours: 0,
				grossSalary: 0,
				lockedCount: 0,
			};

			data.forEach((entry) => {
				totals.hoursNorm += Number(entry.hours_norm) || 0;
				totals.hoursOvertime += Number(entry.hours_overtime) || 0;
				totals.obHours += Number(entry.ob_hours) || 0;
				totals.breakHours += Number(entry.break_hours) || 0;
				totals.totalHours += Number(entry.total_hours) || 0;
				totals.grossSalary += Number(entry.gross_salary_sek) || 0;
				if (entry.locked) {
					totals.lockedCount++;
				}
			});

			// Summary section
			doc.fontSize(12).font('Helvetica-Bold').text('Sammanfattning', { underline: true });
			doc.moveDown(0.3);
			doc.fontSize(10).font('Helvetica');
			doc.text(`Antal personer: ${data.length}`);
			doc.text(`Låsta poster: ${totals.lockedCount}`);
			doc.moveDown(0.5);
			doc.font('Helvetica-Bold').text('Totalt timmar:');
			doc.font('Helvetica');
			doc.text(`  Normaltid: ${formatHours(totals.hoursNorm)}`);
			doc.text(`  Övertid: ${formatHours(totals.hoursOvertime)}`);
			doc.text(`  OB-timmar: ${formatHours(totals.obHours)}`);
			doc.text(`  Rast: ${formatHours(totals.breakHours)}`);
			doc.text(`  Totalt: ${formatHours(totals.totalHours)}`);
			if (totals.grossSalary > 0) {
				doc.moveDown(0.3);
				doc
					.font('Helvetica-Bold')
					.text(
						`Total bruttolön: ${totals.grossSalary.toLocaleString('sv-SE', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})} SEK`
					);
			}
			doc.moveDown(1);

			// Table header
			doc.fontSize(10).font('Helvetica-Bold');
			const tableTop = doc.y;
			const rowHeight = 20;
			const colWidths = {
				name: 120,
				period: 80,
				norm: 50,
				overtime: 50,
				ob: 50,
				break: 50,
				total: 50,
				locked: 40,
			};

			// Draw table header background
			doc.rect(50, tableTop, 500, rowHeight).fill('#E5E7EB');
			doc.fillColor('#000000');

			// Header text
			doc.text('Person', 50, tableTop + 5, { width: colWidths.name });
			doc.text('Period', 170, tableTop + 5, { width: colWidths.period });
			doc.text('Norm', 250, tableTop + 5, { width: colWidths.norm });
			doc.text('Övertid', 300, tableTop + 5, { width: colWidths.overtime });
			doc.text('OB', 350, tableTop + 5, { width: colWidths.ob });
			doc.text('Rast', 400, tableTop + 5, { width: colWidths.break });
			doc.text('Totalt', 450, tableTop + 5, { width: colWidths.total });
			doc.text('Låst', 500, tableTop + 5, { width: colWidths.locked });

			let currentY = tableTop + rowHeight;

			// Table rows
			doc.font('Helvetica').fontSize(9);
			data.forEach((entry, index) => {
				// Check if we need a new page
				if (currentY + rowHeight > doc.page.height - 50) {
					doc.addPage();
					currentY = 50;
					// Redraw header on new page
					doc.font('Helvetica-Bold').fontSize(10);
					doc.rect(50, currentY, 500, rowHeight).fill('#E5E7EB');
					doc.fillColor('#000000');
					doc.text('Person', 50, currentY + 5, { width: colWidths.name });
					doc.text('Period', 170, currentY + 5, { width: colWidths.period });
					doc.text('Norm', 250, currentY + 5, { width: colWidths.norm });
					doc.text('Övertid', 300, currentY + 5, { width: colWidths.overtime });
					doc.text('OB', 350, currentY + 5, { width: colWidths.ob });
					doc.text('Rast', 400, currentY + 5, { width: colWidths.break });
					doc.text('Totalt', 450, currentY + 5, { width: colWidths.total });
					doc.text('Låst', 500, currentY + 5, { width: colWidths.locked });
					currentY += rowHeight;
					doc.font('Helvetica').fontSize(9);
				}

				// Alternate row background
				if (index % 2 === 0) {
					doc.rect(50, currentY, 500, rowHeight).fill('#F9FAFB');
					doc.fillColor('#000000');
				}

				const personName = entry.person?.full_name || 'Okänd';
				const periodText = `${formatDateDisplay(entry.period_start)}\n${formatDateDisplay(entry.period_end)}`;

				doc.text(personName, 50, currentY + 3, {
					width: colWidths.name,
					ellipsis: true,
				});
				doc.text(periodText, 170, currentY + 3, { width: colWidths.period });
				doc.text(formatHours(Number(entry.hours_norm)), 250, currentY + 3, {
					width: colWidths.norm,
				});
				doc.text(formatHours(Number(entry.hours_overtime)), 300, currentY + 3, {
					width: colWidths.overtime,
				});
				doc.text(formatHours(Number(entry.ob_hours)), 350, currentY + 3, {
					width: colWidths.ob,
				});
				doc.text(formatHours(Number(entry.break_hours)), 400, currentY + 3, {
					width: colWidths.break,
				});
				doc.text(formatHours(Number(entry.total_hours)), 450, currentY + 3, {
					width: colWidths.total,
				});
				doc.text(entry.locked ? 'Ja' : 'Nej', 500, currentY + 3, {
					width: colWidths.locked,
				});

				currentY += rowHeight;
			});

			// Add footer to each page before ending
			// Get the buffered page range and add footers
			const pages = doc.bufferedPageRange();
			if (pages && pages.count > 0) {
				for (let i = pages.start; i < pages.start + pages.count; i++) {
					doc.switchToPage(i);
					doc.fontSize(8).font('Helvetica').fillColor('#666666');
					doc.text(
						`Sida ${i - pages.start + 1} av ${pages.count}`,
						50,
						doc.page.height - 30,
						{ align: 'center', width: doc.page.width - 100 }
					);
				}
			}

			doc.end();
		} catch (error) {
			reject(error);
		}
	});
}

