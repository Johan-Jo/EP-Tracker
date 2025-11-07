import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import type { CsvRow } from '@/exporters/payrollCsv';

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
			const [{ exportPayrollFiles }, { collectPayrollPDFData }] = await Promise.all([
				import('@/exporters/csvToPaxml'),
				import('@/lib/exports/payroll-pdf-advanced'),
			]);

			const csvRows: CsvRow[] = [];

			for (const entry of payrollBasis) {
				if (lockedOnly && !entry.locked) {
					continue;
				}

				const csvData = await collectPayrollPDFData(
					membership.org_id,
					entry.person_id,
					periodStart,
					periodEnd,
					'Both',
					{
						payrollBasisId: entry.id,
						requireLocked: true,
					}
				);

				const warningIndices = new Set<number>();
				csvData.compliance_warnings.forEach((warning) => {
					warning.affected_rows?.forEach((idx) => warningIndices.add(idx));
				});

				csvData.wage_type_rows.forEach((row, index) => {
					const rawPersonalNumber = csvData.employee.personal_number || '';
					const sanitizedPersonalNumber = rawPersonalNumber.replace(/[^0-9]/g, '');
					const hasPersonalNumber = sanitizedPersonalNumber.length > 0;
					const commentPrefix = !hasPersonalNumber
						? '[Saknar personnummer i systemet]'
						: undefined;

					csvRows.push({
						personnummer: hasPersonalNumber ? sanitizedPersonalNumber : '000000000000',
						namn: csvData.employee.name,
						period_from: csvData.period_start,
						period_to: csvData.period_end,
						datum: row.date,
						projekt: row.project_name || '',
						kostnadsstalle: row.cost_center || '',
						loneart: row.wage_type_name,
						loneartkod: row.wage_type_code,
						antal: row.quantity,
						apris: row.unit_price_sek,
						belopp: row.amount_sek,
						avvikelse: warningIndices.has(index) || !hasPersonalNumber,
						kommentar: commentPrefix
							? commentPrefix + (row.comment ? ` ${row.comment}` : '')
							: row.comment,
					});
				});
			}

			if (csvRows.length === 0) {
				return NextResponse.json(
					{ error: 'Inga löneartsrader hittades för angiven period' },
					{ status: 404 }
				);
			}

			const targetDir = path.join(process.cwd(), 'exports');
			const baseName =
				personId && payrollBasis.length === 1 && payrollBasis[0]?.person?.full_name
					? `loneunderlag_${periodStart}_${periodEnd}_${sanitizeFilenameSegment(payrollBasis[0].person.full_name)}`
					: `loneunderlag_${periodStart}_${periodEnd}_samtliga`;

			const exportResult = exportPayrollFiles({
				rows: csvRows,
				meta: { periodFrom: periodStart, periodTo: periodEnd },
				employee: {
					name:
						personId && payrollBasis.length === 1
							? payrollBasis[0]?.person?.full_name ?? undefined
							: undefined,
					personalNumber: personId && csvRows[0]?.personnummer ? csvRows[0]?.personnummer : '',
				},
				fileBasename: baseName,
				directory: targetDir,
			});

			const csvBuffer = fs.readFileSync(exportResult.csvPath);

			return new NextResponse(csvBuffer, {
				headers: {
					'Content-Type': 'text/csv; charset=utf-8',
					'Content-Disposition': `attachment; filename="${path.basename(exportResult.csvPath)}"`,
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
				
				const targetEntry =
					payrollBasis.find((p: any) => p.person_id === targetPersonId && (!lockedOnly || p.locked)) ||
					payrollBasis.find((p: any) => p.person_id === targetPersonId);

				const pdfBuffer = await generateAdvancedPayrollPDF(
					membership.org_id,
					targetPersonId,
					periodStart,
					periodEnd,
					exportTarget,
					{
						payrollBasisId: targetEntry?.id,
						requireLocked: lockedOnly,
					}
				);
				
				const personName = targetEntry?.person?.full_name ||
					payrollBasis?.find((p: any) => p.person_id === targetPersonId)?.person?.full_name || 
					payrollBasis?.[0]?.person?.full_name || 'medarbetare';
				const filename = `loneunderlag_${periodStart}_${periodEnd}_${sanitizeFilenameSegment(personName)}.pdf`;

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

function sanitizeFilenameSegment(value: string | undefined | null): string {
	if (!value) return 'medarbetare';
	const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	const sanitized = normalized.replace(/[^0-9A-Za-z_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
	return sanitized || 'medarbetare';
}

