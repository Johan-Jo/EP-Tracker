/**
 * Fortnox API v3 Invoice Types
 * Based on official API documentation: https://api.fortnox.se/apidocs
 * 
 * Last verified: Based on API errors and responses from Fortnox API v3
 * 
 * IMPORTANT NOTES:
 * - Fortnox API v3 is case-sensitive and requires exact field names
 * - Total fields (Total, TotalVAT, TotalExcludingVAT) are calculated automatically - DO NOT include them
 * - Reference fields (Project, ArticleNumber) must reference existing Fortnox entities
 * - Field names must match exactly (e.g. DeliveredQuantity not Quantity, AccountNumber not Account)
 */

/**
 * Fortnox Invoice Payload (POST /3/invoices)
 * 
 * Required fields:
 * - CustomerNumber: Must reference existing Fortnox customer
 * - InvoiceDate: YYYY-MM-DD format
 * - DueDate: YYYY-MM-DD format
 * - InvoiceRows: Array with at least one row
 * 
 * Optional fields:
 * - Currency: Default SEK if not provided
 * - YourReference: Free text
 * - OurReference: Free text
 * - VATIncluded: Boolean flag
 * - RotReducedInvoicingType: 'ROT' | 'RUT' | 'ROTRUT' | empty string
 * - ReverseChargeOnConstructionServices: Boolean flag
 * - Comments: Free text
 * 
 * Fields that MUST NOT be included:
 * - Total, TotalVAT, TotalExcludingVAT: Calculated automatically by Fortnox
 * - Project: Must reference existing Fortnox project (not free text)
 */
export interface FortnoxInvoicePayload {
	/** Required: Customer number in Fortnox (must exist) */
	CustomerNumber: string;
	
	/** Required: Invoice date in YYYY-MM-DD format */
	InvoiceDate: string;
	
	/** Required: Due date in YYYY-MM-DD format */
	DueDate: string;
	
	/** Required: Array of invoice rows (at least one required) */
	InvoiceRows?: FortnoxInvoiceRow[];
	
	/** Optional: Currency code (default: SEK) */
	Currency?: string;
	
	/** Optional: Customer reference */
	YourReference?: string;
	
	/** Optional: Our reference */
	OurReference?: string;
	
	/** Optional: Whether prices include VAT */
	VATIncluded?: boolean;
	
	/** Optional: ROT/RUT reduced invoicing type */
	RotReducedInvoicingType?: 'ROT' | 'RUT' | 'ROTRUT' | '';
	
	/** Optional: Reverse charge for construction services */
	ReverseChargeOnConstructionServices?: boolean;
	
	/** Optional: Comments/notes */
	Comments?: string;
}

/**
 * Fortnox Invoice Row (InvoiceRow in InvoiceRows array)
 * 
 * Required fields:
 * - Description: Text description of the line item
 * - DeliveredQuantity: Quantity delivered (DO NOT use "Quantity")
 * - Price: Unit price (per unit)
 * 
 * Optional fields:
 * - Unit: Unit of measurement (e.g. "st", "tim", "m")
 * - VAT: VAT rate as percentage (e.g. 25 for 25%)
 * - Discount: Discount amount or percentage
 * - DiscountType: 'AMOUNT' | 'PERCENT'
 * - AccountNumber: Account number (DO NOT use "Account")
 * - CostCenter: Cost center code
 * 
 * Fields that MUST NOT be included:
 * - Quantity: Use DeliveredQuantity instead
 * - Account: Use AccountNumber instead
 * - Project: Must reference existing Fortnox project (not free text)
 * - ArticleNumber: Must reference existing Fortnox article (not free text)
 * - Total, TotalVAT, TotalExcludingVAT: Calculated automatically
 */
export interface FortnoxInvoiceRow {
	/** Required: Description of the line item */
	Description: string;
	
	/** Required: Quantity delivered (DO NOT use "Quantity" - use "DeliveredQuantity") */
	DeliveredQuantity: number;
	
	/** Required: Unit price per unit */
	Price: number;
	
	/** Optional: Unit of measurement */
	Unit?: string;
	
	/** Optional: VAT rate as percentage (e.g. 25 for 25%) */
	VAT?: number;
	
	/** Optional: Discount amount or percentage */
	Discount?: number;
	
	/** Optional: Type of discount */
	DiscountType?: 'AMOUNT' | 'PERCENT';
	
	/** Optional: Account number (DO NOT use "Account" - use "AccountNumber") */
	AccountNumber?: number;
	
	/** Optional: Cost center code */
	CostCenter?: string;
}

/**
 * Validation errors for Fortnox invoice payload
 */
export interface FortnoxValidationError {
	field: string;
	message: string;
	value?: unknown;
}

/**
 * Sanitization result with warnings
 */
export interface SanitizationResult<T> {
	/** Sanitized payload */
	data: T;
	
	/** Warnings about removed fields */
	warnings: string[];
	
	/** Validation errors (if any) */
	errors: FortnoxValidationError[];
}

