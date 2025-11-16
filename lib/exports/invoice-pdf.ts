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
    logo_url?: string | null;
    vat_number?: string | null;
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

// Helper to format generic numbers (e.g. quantities) with Swedish locale
function formatNumber(amount: number, decimals = 2): string {
    return new Intl.NumberFormat('sv-SE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
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

// Build a safe, Swedish-style filename for invoice PDFs
export function buildInvoicePdfFilename(
    invoiceBasis: InvoiceBasisRecord,
    customerName?: string | null
): string {
    const isCredit = (invoiceBasis.totals?.total_inc_vat ?? 0) < 0;
    const prefix = isCredit ? 'Kreditfaktura_' : 'Faktura_';

    const seriesPart = invoiceBasis.invoice_series ? `${invoiceBasis.invoice_series}-` : '';
    const invoiceNoRaw = invoiceBasis.invoice_number
        ? `${seriesPart}${invoiceBasis.invoice_number}`
        : `${invoiceBasis.period_start}_${invoiceBasis.period_end}`;

    // Slugify customer name
    let slug = (customerName || '').toLowerCase();
    // Normalize and strip accents
    slug = slug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o');

    slug = slug
        .replace(/[^a-z0-9]+/g, '-') // non-allowed chars → dash
        .replace(/-+/g, '-') // collapse multiple
        .replace(/^-|-$/g, ''); // trim dashes

    if (!slug) slug = 'kund';
    if (slug.length > 30) slug = slug.slice(0, 30).replace(/-+$/g, '');

    // Date part YYYYMMDD from invoice_date or period_end
    const dateSource = invoiceBasis.invoice_date || invoiceBasis.period_end;
    const date = new Date(dateSource);
    const yyyy = date.getFullYear().toString().padStart(4, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;

    // Sanitize invoice number for filename (ASCII, no spaces)
    const safeInvoiceNo = invoiceNoRaw.replace(/[^A-Za-z0-9-_]/g, '_');

    return `${prefix}${safeInvoiceNo}_${slug}_${datePart}.pdf`;
}

export async function generateInvoicePDF(
    lines: InvoiceBasisLine[],
    diarySummaries: DiarySummary[],
    invoiceBasis: InvoiceBasisRecord,
    organization: OrganizationInfo,
    projectName: string
): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 60, bottom: 60, left: 50, right: 50 },
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
            const secondaryColor = '#555555';
            const borderColor = '#e0e0e0';

            // ============================================================
            // Header: Logo + Fakturainformation
            // ============================================================
            const pageWidth = doc.page.width;
            const contentLeft = 50;
            const contentRight = pageWidth - 50;

            let headerTopY = 60;

            // Left: logo or org-name
            let logoBoxWidth = 120;
            let logoBoxHeight = 60;
            let logoRendered = false;

            if (organization.logo_url) {
                try {
                    const response = await fetch(organization.logo_url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        doc.image(buffer, contentLeft, headerTopY, {
                            fit: [logoBoxWidth, logoBoxHeight],
                        });
                        logoRendered = true;
                    }
                } catch {
                    // Silent fallback to text header below
                }
            }

            if (!logoRendered) {
                doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor);
                doc.text(organization.name, contentLeft, headerTopY);
            }

            // Right: FAKTURA + fakturainfo
            const headerInfoX = pageWidth - 220;
            doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('FAKTURA', headerInfoX, headerTopY);

            let infoY = headerTopY + 26;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            const invoiceNo =
                (invoiceBasis.invoice_series ? `${invoiceBasis.invoice_series} ` : '') +
                (invoiceBasis.invoice_number ?? '');
            if (invoiceNo.trim()) {
                doc.text(`Fakturanummer: ${invoiceNo.trim()}`, headerInfoX, infoY);
                infoY += 12;
            }

            if (invoiceBasis.invoice_date) {
                doc.text(`Fakturadatum: ${formatDate(invoiceBasis.invoice_date)}`, headerInfoX, infoY);
                infoY += 12;
            }

            if (invoiceBasis.due_date) {
                doc.text(`Förfallodatum: ${formatDate(invoiceBasis.due_date)}`, headerInfoX, infoY);
                infoY += 12;
            }

            const paymentTerms = invoiceBasis.payment_terms_days ?? 30;
            doc.text(`Betalvillkor: ${paymentTerms} dagar`, headerInfoX, infoY);
            infoY += 12;

            if (invoiceBasis.ocr_ref) {
                doc.text(`OCR: ${invoiceBasis.ocr_ref}`, headerInfoX, infoY);
                infoY += 12;
            }

            // ============================================================
            // Seller / Buyer blocks
            // ============================================================
            let blockTop = headerTopY + Math.max(logoBoxHeight, infoY - headerTopY) + 20;

            const columnWidth = (contentRight - contentLeft) / 2 - 10;

            // Seller (our org)
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Säljare', contentLeft, blockTop);
            let sellerY = blockTop + 14;

            doc.fontSize(9).font('Helvetica').fillColor(primaryColor);
            doc.text(organization.name, contentLeft, sellerY);
            sellerY += 12;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            if (organization.address) {
                doc.text(organization.address, contentLeft, sellerY);
                sellerY += 12;
            }
            if (organization.postal_code && organization.city) {
                doc.text(`${organization.postal_code} ${organization.city}`, contentLeft, sellerY);
                sellerY += 12;
            }

            if (organization.org_number) {
                doc.text(`Org.nr: ${organization.org_number}`, contentLeft, sellerY);
                sellerY += 12;
            }

            if (organization.vat_number) {
                doc.text(`Momsreg.nr: ${organization.vat_number}`, contentLeft, sellerY);
                sellerY += 12;
            }

            // Buyer (customer)
            const buyerX = contentLeft + columnWidth + 20;
            doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Kund', buyerX, blockTop);
            let buyerY = blockTop + 14;

            const invoiceAddr =
                invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object'
                    ? (invoiceBasis.invoice_address_json as Record<string, unknown>)
                    : null;

            doc.fontSize(9).font('Helvetica').fillColor(primaryColor);
            if (invoiceAddr && invoiceAddr.name) {
                doc.text(String(invoiceAddr.name), buyerX, buyerY);
                buyerY += 12;
            }
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
            if (invoiceAddr && invoiceAddr.street) {
                doc.text(String(invoiceAddr.street), buyerX, buyerY);
                buyerY += 12;
            }
            if (invoiceAddr && invoiceAddr.zip && invoiceAddr.city) {
                doc.text(`${invoiceAddr.zip} ${invoiceAddr.city}`, buyerX, buyerY);
                buyerY += 12;
            }
            if (invoiceAddr && invoiceAddr.country) {
                doc.text(String(invoiceAddr.country), buyerX, buyerY);
                buyerY += 12;
            }
            if (invoiceAddr && invoiceAddr.org_no) {
                doc.text(`Org.nr: ${invoiceAddr.org_no}`, buyerX, buyerY);
                buyerY += 12;
            }

            // Small info block (project, period, refs)
            let infoBlockTop = Math.max(sellerY, buyerY) + 16;

            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Fakturaöversikt', contentLeft, infoBlockTop);
            let overviewY = infoBlockTop + 14;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            if (projectName) {
                doc.text(`Projekt: ${projectName}`, contentLeft, overviewY);
                overviewY += 12;
            }

            const periodText = `${formatDate(invoiceBasis.period_start)} – ${formatDate(invoiceBasis.period_end)}`;
            doc.text(`Period: ${periodText}`, contentLeft, overviewY);
            overviewY += 12;

            if (invoiceBasis.our_ref) {
                doc.text(`Vår referens: ${invoiceBasis.our_ref}`, contentLeft, overviewY);
                overviewY += 12;
            }
            if (invoiceBasis.your_ref) {
                doc.text(`Er referens: ${invoiceBasis.your_ref}`, contentLeft, overviewY);
                overviewY += 12;
            }

            // ============================================================
            // Line items table (Swedish layout)
            // ============================================================
            let tableY = overviewY + 24;
            const tableTop = tableY;
            const tableLeft = 50;
            const tableWidth = doc.page.width - 100;
            const colWidths = {
                description: tableWidth * 0.38,
                quantity: tableWidth * 0.1,
                unit: tableWidth * 0.1,
                unitPrice: tableWidth * 0.16,
                vatRate: tableWidth * 0.08,
                total: tableWidth * 0.18,
            };

            const drawTableHeader = () => {
                doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
                doc.text('Beskrivning', tableLeft, tableY);
                doc.text('Antal', tableLeft + colWidths.description, tableY, {
                    width: colWidths.quantity,
                    align: 'right',
                });
                doc.text(
                    'Enhet',
                    tableLeft + colWidths.description + colWidths.quantity,
                    tableY,
                    { width: colWidths.unit, align: 'center' },
                );
                doc.text(
                    'Á-pris',
                    tableLeft + colWidths.description + colWidths.quantity + colWidths.unit,
                    tableY,
                    { width: colWidths.unitPrice, align: 'right' },
                );
                doc.text(
                    'Moms %',
                    tableLeft +
                        colWidths.description +
                        colWidths.quantity +
                        colWidths.unit +
                        colWidths.unitPrice,
                    tableY,
                    { width: colWidths.vatRate, align: 'right' },
                );
                doc.text(
                    'Belopp exkl. moms',
                    tableLeft +
                        colWidths.description +
                        colWidths.quantity +
                        colWidths.unit +
                        colWidths.unitPrice +
                        colWidths.vatRate,
                    tableY,
                    { width: colWidths.total, align: 'right' },
                );

                tableY += 20;
                doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke(borderColor);
                tableY += 10;
            };

            // Initial header
            drawTableHeader();

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
                doc.text(
                    formatNumber(line.quantity || 0),
                    tableLeft + colWidths.description,
                    tableY,
                    { width: colWidths.quantity, align: 'right' },
                );
                doc.text(
                    line.unit || '',
                    tableLeft + colWidths.description + colWidths.quantity,
                    tableY,
                    { width: colWidths.unit, align: 'center' },
                );
                doc.text(
                    formatCurrency(line.unit_price || 0),
                    tableLeft + colWidths.description + colWidths.quantity + colWidths.unit,
                    tableY,
                    { width: colWidths.unitPrice, align: 'right' },
                );
                const vatRate = line.vat_rate || 0;
                doc.text(
                    `${formatNumber(vatRate, 0)} %`,
                    tableLeft +
                        colWidths.description +
                        colWidths.quantity +
                        colWidths.unit +
                        colWidths.unitPrice,
                    tableY,
                    { width: colWidths.vatRate, align: 'right' },
                );
                doc.text(
                    formatCurrency(amountExclVAT),
                    tableLeft +
                        colWidths.description +
                        colWidths.quantity +
                        colWidths.unit +
                        colWidths.unitPrice +
                        colWidths.vatRate,
                    tableY,
                    { width: colWidths.total, align: 'right' },
                );

                tableY += Math.max(descriptionHeight, 15) + 5;

                // Check if we need a new page
                if (tableY > doc.page.height - 150) {
                    doc.addPage();
                    tableY = 60;
                    drawTableHeader();
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
                    const date = diary.date ? String(diary.date).slice(0, 10) : '';
                    const summary = diary.summary.replace(/[\r\n]+/g, ' ').trim();
                    const diaryText = `${date} – ${summary}`;
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
                // VAT breakdown per rate
                doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
                doc.text('Momsöversikt', tableLeft + tableWidth - 200, tableY, {
                    width: 200,
                    align: 'right',
                });
                tableY += 14;

                doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);
                for (const [vatRateStr, vatData] of Object.entries(totals.per_vat_rate)) {
                    if (vatData.base > 0) {
                        const vatRate = parseFloat(vatRateStr);
                        doc.text(
                            `Exkl. moms (${vatRate}%):`,
                            tableLeft + tableWidth - 200,
                            tableY,
                            { width: 150, align: 'right' },
                        );
                        doc.text(
                            formatCurrency(vatData.base),
                            tableLeft + tableWidth - 50,
                            tableY,
                            { width: 50, align: 'right' },
                        );
                        tableY += 12;

                        doc.text(
                            `Moms ${vatRate}%:`,
                            tableLeft + tableWidth - 200,
                            tableY,
                            { width: 150, align: 'right' },
                        );
                        doc.text(
                            formatCurrency(vatData.vat),
                            tableLeft + tableWidth - 50,
                            tableY,
                            { width: 50, align: 'right' },
                        );
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

                const totalExVatLabel = 'Summa exkl. moms:';
                const totalExVatValue = formatCurrency(totals.total_ex_vat);
                doc.text(totalExVatLabel, tableLeft + tableWidth - 200, tableY, {
                    width: 150,
                    align: 'right',
                });
                doc.text(totalExVatValue, tableLeft + tableWidth - 50, tableY, {
                    width: 50,
                    align: 'right',
                });
                tableY += 15;

                const totalVatLabel = 'Summa moms:';
                const totalVatValue = formatCurrency(totals.total_vat);
                doc.text(totalVatLabel, tableLeft + tableWidth - 200, tableY, {
                    width: 150,
                    align: 'right',
                });
                doc.text(totalVatValue, tableLeft + tableWidth - 50, tableY, {
                    width: 50,
                    align: 'right',
                });
                tableY += 18;

                doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor);
                const totalIncVatLabel = 'Att betala (inkl. moms):';
                const totalIncVatValue = formatCurrency(totals.total_inc_vat);
                doc.text(totalIncVatLabel, tableLeft + tableWidth - 200, tableY, {
                    width: 150,
                    align: 'right',
                });
                doc.text(totalIncVatValue, tableLeft + tableWidth - 60, tableY, {
                    width: 60,
                    align: 'right',
                });
            }

            // Reverse charge building text
            if (invoiceBasis.reverse_charge_building) {
                tableY += 20;
                doc.fontSize(9).font('Helvetica-Oblique').fillColor(secondaryColor);
                doc.text('Omvänd byggmoms enligt 6 kap. 12 § mervärdesskattelagen.', tableLeft, tableY, { width: tableWidth });
            }

            // Payment info
            const paymentY = doc.page.height - 110;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
            doc.text('Betalningsinformation', 50, paymentY);

            let paymentInfoY = paymentY + 14;
            doc.fontSize(9).font('Helvetica').fillColor(secondaryColor);

            // Display bank information from organization
            const paymentLines: string[] = [];
            
            if (organization.bankgiro) {
                paymentLines.push(`Bankgiro: ${organization.bankgiro}`);
            }
            
            if (organization.plusgiro) {
                paymentLines.push(`Plusgiro: ${organization.plusgiro}`);
            }
            
            if (organization.iban) {
                paymentLines.push(`IBAN: ${organization.iban}`);
            }
            
            if (organization.bic) {
                paymentLines.push(`BIC/SWIFT: ${organization.bic}`);
            }
            
            // Show OCR reference if available
            if (invoiceBasis.ocr_ref) {
                paymentLines.push(`OCR-nummer: ${invoiceBasis.ocr_ref}`);
            }
            
            // Standard instruction
            paymentLines.push('Ange fakturanummer som referens vid betalning.');

            // Display payment information
            paymentLines.forEach((line, index) => {
                doc.text(line, 50, paymentInfoY + index * 12);
            });

            // Footer legal info
            const footerY = doc.page.height - 40;
            doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke(borderColor);
            doc.fontSize(8).font('Helvetica').fillColor(secondaryColor);

            const seat = organization.city ? `Säte: ${organization.city}` : '';
            const footerParts = [organization.name, organization.org_number ? `Org.nr ${organization.org_number}` : '', seat].filter(Boolean);
            const footerText = footerParts.join(' – ');
            doc.text(footerText, 50, footerY + 8, {
                width: doc.page.width - 100,
                align: 'center',
            });

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
    // Backwards-compatible helper kept for legacy callers.
    const start = periodStart.toISOString().split('T')[0]?.replace(/-/g, '');
    const end = periodEnd.toISOString().split('T')[0]?.replace(/-/g, '');

    const safeInvoiceNo = invoiceNumber
        ? invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')
        : `${start}_${end}`;

    return `Faktura_${safeInvoiceNo}_${end}.pdf`;
}

