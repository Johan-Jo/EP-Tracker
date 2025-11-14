import PDFDocument from 'pdfkit';
import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';

interface DiarySummary {
    date: string;
    raw: string;
    summary: string;
    line_ref: string;
}

interface InvoiceBasisRecord {
    invoice_number: string | null;
    invoice_series: string | null;
    invoice_date: string | null;
    due_date: string | null;
    customer_id: string | null;
    customer_snapshot: Record<string, unknown> | null;
    our_ref: string | null;
    your_ref: string | null;
    currency: string | null;
    ocr_ref: string | null;
    payment_terms_days: number | null;
    rot_rut_flag: boolean | null;
    reverse_charge_building: boolean | null;
    invoice_address_json: Record<string, unknown> | null;
    delivery_address_json: Record<string, unknown> | null;
    project_id: string;
    period_start: string;
    period_end: string;
    totals: {
        currency: string;
        total_ex_vat: number;
        total_vat: number;
        total_inc_vat: number;
        per_vat_rate: Record<string, { base: number; vat: number; total: number }>;
    } | null;
}

interface OrganizationInfo {
    name: string;
    org_number?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    bankgiro?: string | null;
    plusgiro?: string | null;
    iban?: string | null;
    bic?: string | null;
}

// Helper to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: 'SEK',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Helper to format date
function formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('sv-SE');
}

// Helper to calculate line amounts
function calculateLineAmounts(line: InvoiceBasisLine): {
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
    const amountExclVAT = Math.round((quantity * unitPrice * discountFactor) * 100) / 100;
    const amountVAT = Math.round((amountExclVAT * vatRate / 100) * 100) / 100;
    const amountInclVAT = Math.round((amountExclVAT + amountVAT) * 100) / 100;

    return { amountExclVAT, amountVAT, amountInclVAT };
}

export async function generateInvoicePDF(
    lines: InvoiceBasisLine[],
    diarySummaries: DiarySummary[],
    invoiceBasis: InvoiceBasisRecord,
    organization: OrganizationInfo,
    projectName: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
            });

            const buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Colors
            const primaryColor = '#1a1a1a';
            const secondaryColor = '#666666';
            const borderColor = '#e0e0e0';

            // Header - Company info
            doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text(organization.name, 50, 50);

            if (organization.org_number) {
                doc.fontSize(10).font('Helvetica').fillColor(secondaryColor);
                doc.text(`Org.nr: ${organization.org_number}`, 50, 75);
            }

            // Company address
            if (organization.address) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                let addressY = 95;
                doc.text(organization.address, 50, addressY);
                if (organization.postal_code && organization.city) {
                    addressY += 12;
                    doc.text(`${organization.postal_code} ${organization.city}`, 50, addressY);
                }
            }

            // Invoice header (right side)
            doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor);
            const invoiceTitle = invoiceBasis.invoice_series && invoiceBasis.invoice_number
                ? `FAKTURA ${invoiceBasis.invoice_series} ${invoiceBasis.invoice_number}`
                : 'FAKTURA';
            // Calculate width and position to prevent line breaks
            const invoiceTitleWidth = doc.widthOfString(invoiceTitle);
            const invoiceTitleX = doc.page.width - 50 - invoiceTitleWidth;
            // Use text without width option to prevent wrapping - just position it
            doc.text(invoiceTitle, invoiceTitleX, 50);

            // Invoice details (right side)
            let detailY = 75;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            if (invoiceBasis.invoice_date) {
                doc.text(`Fakturadatum: ${formatDate(invoiceBasis.invoice_date)}`, doc.page.width - 200, detailY);
                detailY += 12;
            }

            if (invoiceBasis.due_date) {
                doc.text(`Förfallodatum: ${formatDate(invoiceBasis.due_date)}`, doc.page.width - 200, detailY);
                detailY += 12;
            }

            if (invoiceBasis.payment_terms_days) {
                doc.text(`Betalvillkor: ${invoiceBasis.payment_terms_days} dagar`, doc.page.width - 200, detailY);
                detailY += 12;
            }

            if (invoiceBasis.ocr_ref) {
                doc.text(`OCR: ${invoiceBasis.ocr_ref}`, doc.page.width - 200, detailY);
                detailY += 12;
            }

            // Customer address
            let customerY = 150;
            if (invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object') {
                const invoiceAddr = invoiceBasis.invoice_address_json as Record<string, unknown>;
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
                if (invoiceAddr.name) {
                    doc.text(String(invoiceAddr.name), 50, customerY);
                    customerY += 15;
                }

                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                if (invoiceAddr.street) {
                    doc.text(String(invoiceAddr.street), 50, customerY);
                    customerY += 12;
                }
                if (invoiceAddr.zip && invoiceAddr.city) {
                    doc.text(`${invoiceAddr.zip} ${invoiceAddr.city}`, 50, customerY);
                    customerY += 12;
                }
                if (invoiceAddr.country) {
                    doc.text(String(invoiceAddr.country), 50, customerY);
                    customerY += 12;
                }
                if (invoiceAddr.org_no) {
                    doc.text(`Org.nr: ${invoiceAddr.org_no}`, 50, customerY);
                    customerY += 12;
                }
            }

            // References
            let refY = customerY + 20;
            if (invoiceBasis.our_ref || invoiceBasis.your_ref) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                if (invoiceBasis.our_ref) {
                    doc.text(`Vårt ref: ${invoiceBasis.our_ref}`, 50, refY);
                    refY += 12;
                }
                if (invoiceBasis.your_ref) {
                    doc.text(`Ert ref: ${invoiceBasis.your_ref}`, 50, refY);
                    refY += 12;
                }
            }

            // Project info
            if (projectName) {
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                doc.text(`Projekt: ${projectName}`, 50, refY);
                refY += 12;
            }

            // Period
            doc.text(`Period: ${formatDate(invoiceBasis.period_start)} - ${formatDate(invoiceBasis.period_end)}`, 50, refY);

            // Line items table
            let tableY = refY + 30;
            const tableTop = tableY;
            const tableLeft = 50;
            const tableWidth = doc.page.width - 100;
            const colWidths = {
                description: tableWidth * 0.4,
                quantity: tableWidth * 0.1,
                unit: tableWidth * 0.1,
                unitPrice: tableWidth * 0.15,
                total: tableWidth * 0.15,
            };

            // Table header
            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Beskrivning', tableLeft, tableY);
            doc.text('Antal', tableLeft + colWidths.description, tableY, { width: colWidths.quantity, align: 'right' });
            doc.text('Enhet', tableLeft + colWidths.description + colWidths.quantity, tableY, { width: colWidths.unit, align: 'center' });
            doc.text('Á-pris', tableLeft + colWidths.description + colWidths.quantity + colWidths.unit, tableY, { width: colWidths.unitPrice, align: 'right' });
            doc.text('Totalt', tableLeft + colWidths.description + colWidths.quantity + colWidths.unit + colWidths.unitPrice, tableY, { width: colWidths.total, align: 'right' });

            tableY += 20;
            doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke(borderColor);
            tableY += 10;

            // Table rows (non-diary lines)
            doc.fontSize(9).font('Helvetica').fillColor(primaryColor);
            for (const line of lines) {
                if (line.type === 'diary') continue;

                const { amountExclVAT } = calculateLineAmounts(line);
                const typeMap: Record<string, string> = {
                    time: 'Tid',
                    material: 'Material',
                    expense: 'Utlägg',
                    mileage: 'Mil',
                    ata: 'ÄTA',
                };
                const typeDisplay = typeMap[line.type] || line.type;

                // Description with type prefix
                const description = `${typeDisplay}: ${line.description || ''}`;
                const descriptionHeight = doc.heightOfString(description, { width: colWidths.description });
                
                doc.text(description, tableLeft, tableY, { width: colWidths.description });
                doc.text((line.quantity || 0).toFixed(2), tableLeft + colWidths.description, tableY, { width: colWidths.quantity, align: 'right' });
                doc.text(line.unit || '', tableLeft + colWidths.description + colWidths.quantity, tableY, { width: colWidths.unit, align: 'center' });
                doc.text(formatCurrency(line.unit_price || 0), tableLeft + colWidths.description + colWidths.quantity + colWidths.unit, tableY, { width: colWidths.unitPrice, align: 'right' });
                doc.text(formatCurrency(amountExclVAT), tableLeft + colWidths.description + colWidths.quantity + colWidths.unit + colWidths.unitPrice, tableY, { width: colWidths.total, align: 'right' });

                tableY += Math.max(descriptionHeight, 15) + 5;

                // Check if we need a new page
                if (tableY > doc.page.height - 150) {
                    doc.addPage();
                    tableY = 50;
                }
            }

            // Diary section (before totals)
            if (diarySummaries.length > 0) {
                tableY += 10;
                doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke(borderColor);
                tableY += 15;

                doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
                doc.text('Fakturatext – Dagbok', tableLeft, tableY);
                tableY += 15;

                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                for (const diary of diarySummaries) {
                    const date = formatDate(diary.date);
                    const summary = diary.summary.replace(/[\r\n]+/g, ' ').trim();
                    const diaryText = `${date}: ${summary}`;
                    const diaryHeight = doc.heightOfString(diaryText, { width: tableWidth });
                    
                    doc.text(diaryText, tableLeft, tableY, { width: tableWidth });
                    tableY += diaryHeight + 8;

                    // Check if we need a new page
                    if (tableY > doc.page.height - 150) {
                        doc.addPage();
                        tableY = 50;
                    }
                }
            }

            // Totals section
            tableY += 10;
            doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke(borderColor);
            tableY += 15;

            const totals = invoiceBasis.totals;
            if (totals && totals.per_vat_rate) {
                // VAT breakdown
                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                for (const [vatRateStr, vatData] of Object.entries(totals.per_vat_rate)) {
                    if (vatData.base > 0) {
                        const vatRate = parseFloat(vatRateStr);
                        doc.text(`Exkl. moms (${vatRate}%):`, tableLeft + tableWidth - 200, tableY, { width: 150, align: 'right' });
                        doc.text(formatCurrency(vatData.base), tableLeft + tableWidth - 50, tableY, { width: 50, align: 'right' });
                        tableY += 12;

                        doc.text(`Moms (${vatRate}%):`, tableLeft + tableWidth - 200, tableY, { width: 150, align: 'right' });
                        doc.text(formatCurrency(vatData.vat), tableLeft + tableWidth - 50, tableY, { width: 50, align: 'right' });
                        tableY += 12;
                    }
                }
            }

            // Total lines
            tableY += 5;
            doc.moveTo(tableLeft + tableWidth - 200, tableY).lineTo(tableLeft + tableWidth, tableY).stroke(borderColor);
            tableY += 10;

            if (totals) {
                doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
                // Calculate text width to prevent wrapping
                const totalExVatLabel = 'Totalt exkl. moms:';
                const totalExVatLabelWidth = doc.widthOfString(totalExVatLabel);
                const totalExVatValue = formatCurrency(totals.total_ex_vat);
                const totalExVatValueWidth = doc.widthOfString(totalExVatValue);
                doc.text(totalExVatLabel, tableLeft + tableWidth - 200, tableY, { width: 150, align: 'right' });
                doc.text(totalExVatValue, tableLeft + tableWidth - 50, tableY, { width: 50, align: 'right' });
                tableY += 15;

                const totalVatLabel = 'Totalt moms:';
                const totalVatValue = formatCurrency(totals.total_vat);
                doc.text(totalVatLabel, tableLeft + tableWidth - 200, tableY, { width: 150, align: 'right' });
                doc.text(totalVatValue, tableLeft + tableWidth - 50, tableY, { width: 50, align: 'right' });
                tableY += 15;

                doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor);
                // For the final total, ensure no wrapping by using a wider column
                const totalIncVatLabel = 'Totalt inkl. moms:';
                const totalIncVatValue = formatCurrency(totals.total_inc_vat);
                const totalIncVatValueWidth = doc.widthOfString(totalIncVatValue);
                // Use wider column (60 instead of 50) to prevent wrapping
                doc.text(totalIncVatLabel, tableLeft + tableWidth - 200, tableY, { width: 150, align: 'right' });
                doc.text(totalIncVatValue, tableLeft + tableWidth - 60, tableY, { width: 60, align: 'right' });
            }

            // Reverse charge building text
            if (invoiceBasis.reverse_charge_building) {
                tableY += 20;
                doc.fontSize(9).font('Helvetica-Oblique').fillColor(secondaryColor);
                doc.text('Omvänd byggmoms enligt 6 kap. 12 § mervärdesskattelagen.', tableLeft, tableY, { width: tableWidth });
            }

            // Payment info
            const paymentY = doc.page.height - 100;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Betalningsinformation:', 50, paymentY);

            let paymentInfoY = paymentY + 15;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            // Note: Bankgiro, Plusgiro, IBAN, BIC are not stored in organizations table
            // They would need to be added to the organizations table or fetched from another source
            // For now, we only show OCR if available
            if (invoiceBasis.ocr_ref) {
                doc.text(`Använd OCR-nummer vid betalning: ${invoiceBasis.ocr_ref}`, 50, paymentInfoY);
            }

            // Finalize PDF
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

export function generateInvoicePDFFilename(
    periodStart: Date,
    periodEnd: Date,
    invoiceNumber?: string
): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    
    if (invoiceNumber) {
        const safeInvoiceNo = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        return `faktura_${safeInvoiceNo}_${start}_${end}.pdf`;
    }
    
    return `faktura_${start}_${end}.pdf`;
}

