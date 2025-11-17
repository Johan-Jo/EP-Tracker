import { InvoiceBasisLine, InvoiceTotals } from '@/lib/jobs/invoice-basis-refresh';

/**
 * Type definition for invoice_basis row from database
 * This matches the structure from the invoice_basis table
 */
export interface InvoiceBasisRow {
	id: string;
	org_id: string;
	project_id: string;
	period_start: string;
	period_end: string;
	customer_id: string | null;
	customer_snapshot: Record<string, unknown> | null;
	invoice_series: string | null;
	invoice_number: string | null;
	invoice_date: string | null;
	due_date: string | null;
	payment_terms_days: number | null;
	ocr_ref: string | null;
	currency: string | null;
	fx_rate: number | null;
	our_ref: string | null;
	your_ref: string | null;
	reverse_charge_building: boolean;
	rot_rut_flag: boolean;
	worksite_address_json: Record<string, unknown> | null;
	worksite_id: string | null;
	invoice_address_json: Record<string, unknown> | null;
	delivery_address_json: Record<string, unknown> | null;
	cost_center: string | null;
	result_unit: string | null;
	lines_json: {
		lines: InvoiceBasisLine[];
		diary: Array<{
			date: string;
			raw: string;
			summary: string;
			line_ref: string;
		}>;
	};
	totals: InvoiceTotals | null;
	locked: boolean;
	locked_by: string | null;
	locked_at: string | null;
	hash_signature: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Fortnox invoice payload structure
 * Based on Fortnox API v3 documentation
 */
export interface FortnoxInvoicePayload {
	CustomerNumber: string;
	InvoiceDate: string;
	DueDate: string;
	InvoiceRows?: FortnoxInvoiceRow[];
	Currency?: string;
	YourReference?: string;
	OurReference?: string;
	Project?: string;
	Total?: number;
	TotalVAT?: number;
	TotalExcludingVAT?: number;
	VATIncluded?: boolean;
	RotReducedInvoicingType?: string;
	ReverseChargeOnConstructionServices?: boolean;
	Comments?: string;
}

/**
 * Fortnox invoice row structure
 */
export interface FortnoxInvoiceRow {
	ArticleNumber?: string;
	Description: string;
	Quantity: number;
	Unit?: string;
	Price: number;
	Discount?: number;
	DiscountType?: 'AMOUNT' | 'PERCENT';
	VAT?: number;
	Account?: number;
	CostCenter?: string;
	Project?: string;
}

/**
 * Options for building Fortnox invoice payload
 */
export interface BuildFortnoxInvoicePayloadOptions {
	customerFortnoxNumber: string;
	projectName?: string;
}

/**
 * Calculate line amounts with discount and VAT
 */
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

/**
 * Format date to YYYY-MM-DD format for Fortnox
 */
function formatDateForFortnox(dateString: string | null): string {
	if (!dateString) {
		return new Date().toISOString().split('T')[0]!;
	}
	return new Date(dateString).toISOString().split('T')[0]!;
}

/**
 * Build Fortnox invoice payload from locked invoice_basis
 * @param invoiceBasis Locked invoice_basis record
 * @param options Options including customer Fortnox number and optional project name
 * @returns Fortnox invoice payload ready for API
 */
export async function buildFortnoxInvoicePayloadFromInvoiceBasis(
	invoiceBasis: InvoiceBasisRow,
	options: BuildFortnoxInvoicePayloadOptions
): Promise<FortnoxInvoicePayload> {
	// Validate that invoice_basis is locked
	if (!invoiceBasis.locked) {
		throw new Error('Invoice basis must be locked before exporting to Fortnox');
	}

	// Extract lines (exclude diary type lines as they're informational)
	const invoiceLines = invoiceBasis.lines_json.lines.filter((line) => line.type !== 'diary');

	// Map invoice lines to Fortnox invoice rows
	const fortnoxRows: FortnoxInvoiceRow[] = invoiceLines.map((line) => {
		const { amountExclVAT } = calculateLineAmounts(line);

		// Build description
		let description = line.description || '';
		
		// Add type prefix for clarity
		const typeMap: Record<string, string> = {
			time: 'Tid',
			material: 'Material',
			expense: 'Utlägg',
			mileage: 'Mil',
			ata: 'ÄTA',
		};
		const typeDisplay = typeMap[line.type] || line.type;
		if (description && line.type !== 'diary') {
			description = `${typeDisplay}: ${description}`;
		}

		// Add ATA info if present
		if (line.ata_info?.ata_number) {
			description = `${description} (ÄTA ${line.ata_info.ata_number})`;
		}

		const row: FortnoxInvoiceRow = {
			Description: description,
			Quantity: line.quantity || 0,
			Price: line.unit_price || 0,
			VAT: line.vat_rate || 0,
		};

		// Add optional fields if present
		if (line.article_code) {
			row.ArticleNumber = line.article_code;
		}

		if (line.unit) {
			row.Unit = line.unit;
		}

		if (line.discount && line.discount > 0) {
			row.Discount = line.discount;
			row.DiscountType = 'PERCENT';
		}

		if (line.account) {
			// Fortnox expects account as number
			const accountNum = parseInt(line.account, 10);
			if (!isNaN(accountNum)) {
				row.Account = accountNum;
			}
		}

		// Add cost center from line dimensions or invoice_basis
		const costCenter = line.dimensions?.cost_center || invoiceBasis.cost_center;
		if (costCenter) {
			row.CostCenter = String(costCenter);
		}

		// Add project if provided
		if (options.projectName) {
			row.Project = options.projectName;
		}

		return row;
	});

	// Build diary summary as a comment row if present
	const diarySummaries = invoiceBasis.lines_json.diary || [];
	let diaryComment = '';
	if (diarySummaries.length > 0) {
		const diaryTexts = diarySummaries.map((diary) => {
			const date = diary.date ? new Date(diary.date).toISOString().split('T')[0] : '';
			const summary = diary.summary.replace(/[\r\n]+/g, ' ').trim();
			return `${date}: ${summary}`;
		});
		diaryComment = `Fakturatext – Dagbok:\n${diaryTexts.join('\n')}`;
	}

	// Build the payload
	const payload: FortnoxInvoicePayload = {
		CustomerNumber: options.customerFortnoxNumber,
		InvoiceDate: formatDateForFortnox(invoiceBasis.invoice_date),
		DueDate: formatDateForFortnox(invoiceBasis.due_date),
		InvoiceRows: fortnoxRows,
	};

	// Add currency if not SEK
	if (invoiceBasis.currency && invoiceBasis.currency !== 'SEK') {
		payload.Currency = invoiceBasis.currency;
	}

	// Add references
	if (invoiceBasis.your_ref) {
		payload.YourReference = invoiceBasis.your_ref;
	}

	if (invoiceBasis.our_ref) {
		payload.OurReference = invoiceBasis.our_ref;
	}

	// Add project name if provided
	if (options.projectName) {
		payload.Project = options.projectName;
	}

	// Add totals from invoice_basis (Fortnox will recalculate, but we include for reference)
	if (invoiceBasis.totals) {
		payload.TotalExcludingVAT = Math.round(invoiceBasis.totals.total_ex_vat * 100) / 100;
		payload.TotalVAT = Math.round(invoiceBasis.totals.total_vat * 100) / 100;
		payload.Total = Math.round(invoiceBasis.totals.total_inc_vat * 100) / 100;
		payload.VATIncluded = true; // Swedish invoices typically include VAT
	}

	// Add ROT/RUT flag if applicable
	if (invoiceBasis.rot_rut_flag) {
		// Fortnox uses specific values for ROT/RUT reduced invoicing
		// Common values: "ROT", "RUT", "ROTRUT", or empty string
		// We'll use "ROTRUT" as a default, but this should be configurable per organization
		payload.RotReducedInvoicingType = 'ROTRUT';
	}

	// Add reverse charge building flag
	if (invoiceBasis.reverse_charge_building) {
		payload.ReverseChargeOnConstructionServices = true;
	}

	// Add diary comment if present
	if (diaryComment) {
		payload.Comments = diaryComment;
	}

	return payload;
}


