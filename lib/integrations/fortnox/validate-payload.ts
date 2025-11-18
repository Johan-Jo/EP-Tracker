/**
 * Fortnox API v3 Payload Validation and Sanitization
 * 
 * This module validates and sanitizes Fortnox invoice payloads before sending them to the API.
 * It ensures that only valid fields are included and removes any fields that would cause API errors.
 */

import type {
	FortnoxInvoicePayload,
	FortnoxInvoiceRow,
	FortnoxValidationError,
	SanitizationResult,
} from './types';

/**
 * Fields that must NEVER be included in the payload
 * These will be automatically removed if present
 */
const FORBIDDEN_PAYLOAD_FIELDS = [
	'Total',
	'TotalVAT',
	'TotalExcludingVAT',
	'Project', // Must reference existing Fortnox project, not free text
] as const;

/**
 * Fields that must NEVER be included in invoice rows
 * These will be automatically removed if present
 */
const FORBIDDEN_ROW_FIELDS = [
	'Quantity', // Use DeliveredQuantity instead
	'Account', // Use AccountNumber instead
	'Project', // Must reference existing Fortnox project
	'ArticleNumber', // Must reference existing Fortnox article
	'Total',
	'TotalVAT',
	'TotalExcludingVAT',
] as const;

/**
 * Field name mappings for backward compatibility
 * Maps old field names to new field names
 */
const FIELD_NAME_MAPPINGS: Record<string, string> = {
	Quantity: 'DeliveredQuantity',
	Account: 'AccountNumber',
};

/**
 * Sanitize a single invoice row
 * Removes invalid fields and renames old field names
 */
export function sanitizeInvoiceRow(
	row: unknown
): SanitizationResult<FortnoxInvoiceRow> {
	const warnings: string[] = [];
	const errors: FortnoxValidationError[] = [];
	const rowAny = row as Record<string, unknown>;

	// Start with a clean object
	const sanitized: Partial<FortnoxInvoiceRow> = {};

	// Required fields validation
	if (!rowAny.Description && typeof rowAny.Description !== 'string') {
		errors.push({
			field: 'Description',
			message: 'Description is required',
		});
	} else {
		sanitized.Description = String(rowAny.Description).trim();
	}

	if (typeof rowAny.DeliveredQuantity !== 'number' && typeof rowAny.Quantity !== 'number') {
		errors.push({
			field: 'DeliveredQuantity',
			message: 'DeliveredQuantity or Quantity is required',
		});
	} else {
		// Support both old (Quantity) and new (DeliveredQuantity) field names
		if ('Quantity' in rowAny && typeof rowAny.Quantity === 'number') {
			sanitized.DeliveredQuantity = rowAny.Quantity;
			warnings.push('Field "Quantity" was renamed to "DeliveredQuantity"');
		} else if ('DeliveredQuantity' in rowAny && typeof rowAny.DeliveredQuantity === 'number') {
			sanitized.DeliveredQuantity = rowAny.DeliveredQuantity;
		}
	}

	if (typeof rowAny.Price !== 'number') {
		errors.push({
			field: 'Price',
			message: 'Price is required and must be a number',
		});
	} else {
		sanitized.Price = rowAny.Price;
	}

	// Optional fields - only include if present and valid
	if ('Unit' in rowAny && typeof rowAny.Unit === 'string' && rowAny.Unit.trim()) {
		sanitized.Unit = rowAny.Unit.trim();
	}

	if ('VAT' in rowAny && typeof rowAny.VAT === 'number') {
		sanitized.VAT = rowAny.VAT;
	}

	if ('Discount' in rowAny && typeof rowAny.Discount === 'number') {
		sanitized.Discount = rowAny.Discount;
	}

	if ('DiscountType' in rowAny && (rowAny.DiscountType === 'AMOUNT' || rowAny.DiscountType === 'PERCENT')) {
		sanitized.DiscountType = rowAny.DiscountType;
	}

	// Support both old (Account) and new (AccountNumber) field names
	if ('AccountNumber' in rowAny && typeof rowAny.AccountNumber === 'number') {
		sanitized.AccountNumber = rowAny.AccountNumber;
	} else if ('Account' in rowAny) {
		const accountValue = rowAny.Account;
		if (typeof accountValue === 'number') {
			sanitized.AccountNumber = accountValue;
			warnings.push('Field "Account" was renamed to "AccountNumber"');
		} else if (typeof accountValue === 'string') {
			const accountNum = parseInt(accountValue, 10);
			if (!isNaN(accountNum)) {
				sanitized.AccountNumber = accountNum;
				warnings.push('Field "Account" (string) was converted to "AccountNumber" (number)');
			}
		}
	}

	if ('CostCenter' in rowAny && typeof rowAny.CostCenter === 'string' && rowAny.CostCenter.trim()) {
		sanitized.CostCenter = rowAny.CostCenter.trim();
	}

	// Remove forbidden fields and log warnings
	for (const field of FORBIDDEN_ROW_FIELDS) {
		if (field in rowAny) {
			warnings.push(`Field "${field}" was removed (not allowed in Fortnox API v3)`);
		}
	}

	// Check for ArticleNumber and Project (common mistakes)
	if ('ArticleNumber' in rowAny) {
		warnings.push('Field "ArticleNumber" was removed (must reference existing Fortnox article)');
	}

	if ('Project' in rowAny) {
		warnings.push('Field "Project" was removed (must reference existing Fortnox project)');
	}

	return {
		data: sanitized as FortnoxInvoiceRow,
		warnings,
		errors,
	};
}

/**
 * Validate and sanitize a Fortnox invoice payload
 * Removes invalid fields, renames old field names, and validates required fields
 */
export function validateFortnoxInvoicePayload(
	payload: unknown
): SanitizationResult<FortnoxInvoicePayload> {
	const warnings: string[] = [];
	const errors: FortnoxValidationError[] = [];
	const payloadAny = payload as Record<string, unknown>;

	// Start with a clean object
	const sanitized: Partial<FortnoxInvoicePayload> = {};

	// Required fields validation
	if (!payloadAny.CustomerNumber || typeof payloadAny.CustomerNumber !== 'string') {
		errors.push({
			field: 'CustomerNumber',
			message: 'CustomerNumber is required',
		});
	} else {
		sanitized.CustomerNumber = String(payloadAny.CustomerNumber).trim();
	}

	if (!payloadAny.InvoiceDate || typeof payloadAny.InvoiceDate !== 'string') {
		errors.push({
			field: 'InvoiceDate',
			message: 'InvoiceDate is required (format: YYYY-MM-DD)',
		});
	} else {
		sanitized.InvoiceDate = String(payloadAny.InvoiceDate).trim();
	}

	if (!payloadAny.DueDate || typeof payloadAny.DueDate !== 'string') {
		errors.push({
			field: 'DueDate',
			message: 'DueDate is required (format: YYYY-MM-DD)',
		});
	} else {
		sanitized.DueDate = String(payloadAny.DueDate).trim();
	}

	// Validate and sanitize InvoiceRows
	if (Array.isArray(payloadAny.InvoiceRows)) {
		if (payloadAny.InvoiceRows.length === 0) {
			errors.push({
				field: 'InvoiceRows',
				message: 'At least one InvoiceRow is required',
			});
		} else {
			const sanitizedRows: FortnoxInvoiceRow[] = [];
			for (let i = 0; i < payloadAny.InvoiceRows.length; i++) {
				const rowResult = sanitizeInvoiceRow(payloadAny.InvoiceRows[i]);
				if (rowResult.errors.length > 0) {
					errors.push(
						...rowResult.errors.map((err) => ({
							...err,
							field: `InvoiceRows[${i}].${err.field}`,
						}))
					);
				}
				if (rowResult.warnings.length > 0) {
					warnings.push(
						...rowResult.warnings.map((warn) => `InvoiceRows[${i}]: ${warn}`)
					);
				}
				sanitizedRows.push(rowResult.data);
			}
			sanitized.InvoiceRows = sanitizedRows;
		}
	} else if (payloadAny.InvoiceRows !== undefined) {
		errors.push({
			field: 'InvoiceRows',
			message: 'InvoiceRows must be an array',
		});
	}

	// Optional fields - only include if present and valid
	if ('Currency' in payloadAny && typeof payloadAny.Currency === 'string' && payloadAny.Currency.trim()) {
		sanitized.Currency = payloadAny.Currency.trim();
	}

	if ('YourReference' in payloadAny && typeof payloadAny.YourReference === 'string' && payloadAny.YourReference.trim()) {
		sanitized.YourReference = payloadAny.YourReference.trim();
	}

	if ('OurReference' in payloadAny && typeof payloadAny.OurReference === 'string' && payloadAny.OurReference.trim()) {
		sanitized.OurReference = payloadAny.OurReference.trim();
	}

	if ('VATIncluded' in payloadAny && typeof payloadAny.VATIncluded === 'boolean') {
		sanitized.VATIncluded = payloadAny.VATIncluded;
	}

	if ('RotReducedInvoicingType' in payloadAny && typeof payloadAny.RotReducedInvoicingType === 'string') {
		const rotType = payloadAny.RotReducedInvoicingType;
		if (rotType === 'ROT' || rotType === 'RUT' || rotType === 'ROTRUT' || rotType === '') {
			sanitized.RotReducedInvoicingType = rotType;
		} else {
			warnings.push(`Invalid RotReducedInvoicingType "${rotType}" was removed`);
		}
	}

	if ('ReverseChargeOnConstructionServices' in payloadAny && typeof payloadAny.ReverseChargeOnConstructionServices === 'boolean') {
		sanitized.ReverseChargeOnConstructionServices = payloadAny.ReverseChargeOnConstructionServices;
	}

	if ('Comments' in payloadAny && typeof payloadAny.Comments === 'string' && payloadAny.Comments.trim()) {
		sanitized.Comments = payloadAny.Comments.trim();
	}

	// Remove forbidden fields and log warnings
	for (const field of FORBIDDEN_PAYLOAD_FIELDS) {
		if (field in payloadAny) {
			warnings.push(`Field "${field}" was removed from payload (not allowed in Fortnox API v3)`);
		}
	}

	// Special check for total fields
	if ('Total' in payloadAny || 'TotalVAT' in payloadAny || 'TotalExcludingVAT' in payloadAny) {
		warnings.push('Total fields (Total, TotalVAT, TotalExcludingVAT) were removed (calculated automatically by Fortnox)');
	}

	return {
		data: sanitized as FortnoxInvoicePayload,
		warnings,
		errors,
	};
}

