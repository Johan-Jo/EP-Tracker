import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';

interface DiarySummary {
    date: string;
    raw: string;
    summary: string;
    line_ref: string;
}

interface InvoiceBasisRecord {
    invoice_number: string | null;
    invoice_date: string | null;
    due_date: string | null;
    customer_id: string | null;
    customer_snapshot: Record<string, unknown> | null;
    our_ref: string | null;
    your_ref: string | null;
    currency: string | null;
    project_id: string;
    period_start: string;
    period_end: string;
    dimensions?: Record<string, string | null>;
}

// Helper to calculate amounts with discount and VAT
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

// Helper to get project dimension from line
function getProjectDimension(line: InvoiceBasisLine): string {
    return line.dimensions?.project || '';
}

// Helper to get cost center from line
function getCostCenter(line: InvoiceBasisLine): string {
    return line.dimensions?.cost_center || '';
}

export function generateInvoiceCSV(
    lines: InvoiceBasisLine[],
    diarySummaries: DiarySummary[],
    invoiceBasis: InvoiceBasisRecord
): string {
    const rows: string[] = [];
    
    // CSV Header according to EPIC 34 spec
    rows.push([
        'InvoiceNo',
        'InvoiceDate',
        'DueDate',
        'CustomerNo',
        'OurRef',
        'YourRef',
        'Currency',
        'Project',
        'CostCenter',
        'WorksiteId',
        'Type',
        'Article',
        'Text',
        'Qty',
        'Unit',
        'UnitPrice',
        'Discount',
        'VATRate',
        'Account',
        'AmountExclVAT',
        'AmountVAT',
        'AmountInclVAT'
    ].join(';'));

    // Get invoice header values
    const invoiceNo = invoiceBasis.invoice_number || '';
    const invoiceDate = invoiceBasis.invoice_date 
        ? new Date(invoiceBasis.invoice_date).toLocaleDateString('sv-SE')
        : '';
    const dueDate = invoiceBasis.due_date
        ? new Date(invoiceBasis.due_date).toLocaleDateString('sv-SE')
        : '';
    // Get customer_no from customer_snapshot if available, otherwise use customer_id
    const customerNo = invoiceBasis.customer_snapshot && typeof invoiceBasis.customer_snapshot === 'object' && invoiceBasis.customer_snapshot !== null
        ? (invoiceBasis.customer_snapshot as { customer_no?: string }).customer_no || invoiceBasis.customer_id || ''
        : invoiceBasis.customer_id || '';
    const ourRef = invoiceBasis.our_ref || '';
    const yourRef = invoiceBasis.your_ref || '';
    const currency = invoiceBasis.currency || 'SEK';
    const worksiteId = invoiceBasis.dimensions?.worksite_id || '';

    // Process all non-diary lines
    for (const line of lines) {
        if (line.type === 'diary') continue; // Diary lines added separately at the end

        const { amountExclVAT, amountVAT, amountInclVAT } = calculateLineAmounts(line);
        const projectDimension = getProjectDimension(line);
        const costCenter = getCostCenter(line);

        // Map line type to display name
        const typeMap: Record<string, string> = {
            time: 'Tid',
            material: 'Material',
            expense: 'Utlägg',
            mileage: 'Mil',
            ata: 'ÄTA',
        };
        const typeDisplay = typeMap[line.type] || line.type;
        
        rows.push([
            invoiceNo,
            invoiceDate,
            dueDate,
            customerNo,
            ourRef,
            yourRef,
            currency,
            projectDimension,
            costCenter,
            worksiteId,
            typeDisplay,
            line.article_code || '',
            line.description || '',
            line.quantity?.toFixed(2) || '0',
            line.unit || '',
            line.unit_price?.toFixed(2) || '0',
            line.discount?.toFixed(2) || '0',
            line.vat_rate?.toString() || '0',
            line.account || '',
            amountExclVAT.toFixed(2),
            amountVAT.toFixed(2),
            amountInclVAT.toFixed(2)
        ].join(';'));
    }

    // Add diary entries as separate rows at the end (EPIC 34 requirement)
    for (const diary of diarySummaries) {
        const date = new Date(diary.date).toLocaleDateString('sv-SE');
        // Sanitize text: replace line breaks with spaces, remove semicolons
        const sanitizedText = diary.summary
            .replace(/[\r\n]+/g, ' ')
            .replace(/;/g, ',')
            .trim();
        
        rows.push([
            invoiceNo,
            invoiceDate,
            dueDate,
            customerNo,
            ourRef,
            yourRef,
            currency,
            '', // Project (already in text)
            '', // CostCenter
            worksiteId,
            'Dagbok',
            '', // Article
            sanitizedText,
            '0', // Qty
            '', // Unit
            '0', // UnitPrice
            '0', // Discount
            '0', // VATRate
            '', // Account
            '0', // AmountExclVAT
            '0', // AmountVAT
            '0'  // AmountInclVAT
        ].join(';'));
    }

    return rows.join('\n');
}

export function generateInvoiceCSVFilename(
    periodStart: Date,
    periodEnd: Date,
    invoiceNumber?: string
): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    
    if (invoiceNumber) {
        // Sanitize invoice number for filename
        const safeInvoiceNo = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        return `faktura_${safeInvoiceNo}_${start}_${end}.csv`;
    }
    
    return `faktura_${start}_${end}.csv`;
}

