import { InvoiceBasisLine, InvoiceTotals } from '@/lib/jobs/invoice-basis-refresh';
import type { FortnoxInvoicePayload, FortnoxInvoiceRow } from './types';
import { validateFortnoxInvoicePayload } from './validate-payload';

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

		// Build description based on line type
		let description = line.description || '';
		
		// For time entries: include date, person, and diary in description
		if (line.type === 'time') {
			const parts: string[] = [];
			
			// Add date if present
			if (line.date) {
				parts.push(line.date);
			}
			
			// Add person if present
			if (line.person) {
				parts.push(line.person);
			}
			
			// Add main description
			if (description) {
				parts.push(description);
			}
			
			// Add diary text if present (this replaces the separate diary comment)
			if (line.diary) {
				parts.push(`Dagbok: ${line.diary}`);
			}
			
			description = parts.join(' - ');
		} else {
			// For other types: add date if present, then description
			const parts: string[] = [];
			
			// Add date if present (for materials, expenses, etc.)
			if (line.date) {
				parts.push(line.date);
			}
			
			// Add type prefix for clarity
			const typeMap: Record<string, string> = {
				material: 'Material',
				expense: 'Utlägg',
				mileage: 'Mil',
				ata: 'ÄTA',
			};
			const typeDisplay = typeMap[line.type] || line.type;
			if (description) {
				parts.push(`${typeDisplay}: ${description}`);
			} else {
				parts.push(typeDisplay);
			}
			
			description = parts.join(' - ');
		}

		// Add ATA info if present (for non-time entries)
		if (line.ata_info?.ata_number && line.type !== 'time') {
			description = `${description} (ÄTA ${line.ata_info.ata_number})`;
		}

	// For Fortnox API v3, use DeliveredQuantity instead of Quantity
	// Quantity field is not allowed in API v3 - use DeliveredQuantity instead
	// 
	// IMPORTANT: These values must match exactly what's shown in the PDF:
	// - DeliveredQuantity = line.quantity (same as PDF shows in "Timmar"/"Antal")
	// - Price = line.unit_price (same as PDF shows in "À-pris" if visible, or used for calculation)
	// - VAT = line.vat_rate (same as PDF uses for VAT calculation)
	// - Discount = line.discount (same as PDF uses for discount calculation)
	// 
	// Fortnox calculates the total as: DeliveredQuantity * Price * (1 - Discount/100)
	// This matches PDF calculation: quantity * unit_price * discountFactor
	// where discountFactor = 1 - discount/100
	const row: FortnoxInvoiceRow = {
		Description: description,
		DeliveredQuantity: line.quantity || 0,
		Price: line.unit_price || 0,
		VAT: line.vat_rate || 0,
	};

		// NOTE: Do NOT include ArticleNumber unless it references an existing Fortnox article
		// Fortnox ArticleNumber field expects a reference to an existing Fortnox article, not just any text
		// If ArticleNumber doesn't exist in Fortnox, the export will fail
		// Article information is already included in the Description field

		// For time entries, don't include unit (removed from UI)
		if (line.unit && line.type !== 'time') {
			row.Unit = line.unit;
		}

		if (line.discount && line.discount > 0) {
			row.Discount = line.discount;
			row.DiscountType = 'PERCENT';
		}

		// NOTE: AccountNumber is NOT sent to Fortnox
		// We let Fortnox use its default account for invoices instead of specifying one
		// This avoids errors like "Kunde inte hitta konto 3041" when the account doesn't exist in Fortnox
		// If you need to specify an account, it must exist in Fortnox first
		// Uncomment the code below only if you have accounts created in Fortnox and want to use them:
		//
		// if (line.account) {
		// 	const accountNum = parseInt(line.account, 10);
		// 	if (!isNaN(accountNum)) {
		// 		row.AccountNumber = accountNum;
		// 	}
		// }

		// Add cost center from line dimensions or invoice_basis
		const costCenter = line.dimensions?.cost_center || invoiceBasis.cost_center;
		if (costCenter) {
			row.CostCenter = String(costCenter);
		}

		// NOTE: Do NOT include Project field in InvoiceRows
		// Fortnox Project field expects a reference to an existing Fortnox project, not a text string
		// Project information is already included in the Description field

		return row;
	});

	// Diary entries are now integrated into time entry descriptions above
	// No separate diary comment needed

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

	// NOTE: Do NOT include Project field in payload
	// Fortnox Project field expects a reference to an existing Fortnox project, not a text string
	// Project information is already included in the Description fields of InvoiceRows

	// Note: Fortnox calculates totals automatically from InvoiceRows
	// We should NOT include Total, TotalVAT, or TotalExcludingVAT in the payload
	// as Fortnox will reject the request with "Felaktigt fältnamn" error
	
	// Add VATIncluded flag if totals exist
	if (invoiceBasis.totals) {
		payload.VATIncluded = true; // Swedish invoices typically include VAT
		// Fortnox will calculate Total, TotalVAT, and TotalExcludingVAT from InvoiceRows
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

	// Validate and sanitize payload using the validation layer
	// This removes invalid fields, renames old field names, and ensures required fields are present
	const validationResult = validateFortnoxInvoicePayload(payload);

	// Log warnings if any fields were removed or renamed
	if (validationResult.warnings.length > 0) {
		console.warn('[Fortnox Export] Payload validation warnings:', validationResult.warnings);
		for (const warning of validationResult.warnings) {
			console.warn(`[Fortnox Export] ${warning}`);
		}
	}

	// Throw error if validation found critical issues
	if (validationResult.errors.length > 0) {
		const errorMessages = validationResult.errors.map((err) => `${err.field}: ${err.message}`).join(', ');
		throw new Error(`Fortnox invoice payload validation failed: ${errorMessages}`);
	}

	return validationResult.data;
}


