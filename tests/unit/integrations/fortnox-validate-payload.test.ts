/**
 * Unit tests for Fortnox payload validation and sanitization
 * Tests that invalid fields are removed and old field names are renamed correctly
 */

import {
	validateFortnoxInvoicePayload,
	sanitizeInvoiceRow,
} from '@/lib/integrations/fortnox/validate-payload';
import type { FortnoxInvoicePayload, FortnoxInvoiceRow } from '@/lib/integrations/fortnox/types';

describe('Fortnox Payload Validation', () => {
	describe('sanitizeInvoiceRow', () => {
		it('should sanitize a valid invoice row', () => {
			const row = {
				Description: 'Test description',
				DeliveredQuantity: 8,
				Price: 500,
				VAT: 25,
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.errors).toHaveLength(0);
			expect(result.data.Description).toBe('Test description');
			expect(result.data.DeliveredQuantity).toBe(8);
			expect(result.data.Price).toBe(500);
			expect(result.data.VAT).toBe(25);
		});

		it('should rename Quantity to DeliveredQuantity', () => {
			const row = {
				Description: 'Test',
				Quantity: 8, // Old field name
				Price: 500,
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.warnings).toContain('Field "Quantity" was renamed to "DeliveredQuantity"');
			expect(result.data.DeliveredQuantity).toBe(8);
			expect(result.data).not.toHaveProperty('Quantity');
		});

		it('should rename Account to AccountNumber', () => {
			const row = {
				Description: 'Test',
				DeliveredQuantity: 1,
				Price: 100,
				Account: 3000, // Old field name
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.warnings).toContain('Field "Account" was renamed to "AccountNumber"');
			expect(result.data.AccountNumber).toBe(3000);
			expect(result.data).not.toHaveProperty('Account');
		});

		it('should convert Account string to AccountNumber number', () => {
			const row = {
				Description: 'Test',
				DeliveredQuantity: 1,
				Price: 100,
				Account: '3000', // String value
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.warnings).toContain('Field "Account" (string) was converted to "AccountNumber" (number)');
			expect(result.data.AccountNumber).toBe(3000);
			expect(typeof result.data.AccountNumber).toBe('number');
		});

		it('should remove forbidden fields from row', () => {
			const row = {
				Description: 'Test',
				DeliveredQuantity: 1,
				Price: 100,
				Quantity: 1, // Should be renamed
				Account: 3000, // Should be renamed
				Project: 'PROJ-001', // Should be removed
				ArticleNumber: 'ART-001', // Should be removed
				Total: 100, // Should be removed
				TotalVAT: 25, // Should be removed
				TotalExcludingVAT: 75, // Should be removed
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.data).not.toHaveProperty('Project');
			expect(result.data).not.toHaveProperty('ArticleNumber');
			expect(result.data).not.toHaveProperty('Total');
			expect(result.data).not.toHaveProperty('TotalVAT');
			expect(result.data).not.toHaveProperty('TotalExcludingVAT');
			expect(result.warnings).toContain('Field "Project" was removed (not allowed in Fortnox API v3)');
			expect(result.warnings).toContain('Field "ArticleNumber" was removed (must reference existing Fortnox article)');
		});

		it('should require Description field', () => {
			const row = {
				DeliveredQuantity: 1,
				Price: 100,
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('Description');
			expect(result.errors[0]?.message).toBe('Description is required');
		});

		it('should require DeliveredQuantity or Quantity field', () => {
			const row = {
				Description: 'Test',
				Price: 100,
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('DeliveredQuantity');
		});

		it('should require Price field', () => {
			const row = {
				Description: 'Test',
				DeliveredQuantity: 1,
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('Price');
		});

		it('should preserve optional fields when valid', () => {
			const row = {
				Description: 'Test',
				DeliveredQuantity: 1,
				Price: 100,
				Unit: 'tim',
				VAT: 25,
				Discount: 10,
				DiscountType: 'PERCENT' as const,
				AccountNumber: 3000,
				CostCenter: 'CC001',
			};

			const result = sanitizeInvoiceRow(row);

			expect(result.errors).toHaveLength(0);
			expect(result.data.Unit).toBe('tim');
			expect(result.data.VAT).toBe(25);
			expect(result.data.Discount).toBe(10);
			expect(result.data.DiscountType).toBe('PERCENT');
			expect(result.data.AccountNumber).toBe(3000);
			expect(result.data.CostCenter).toBe('CC001');
		});
	});

	describe('validateFortnoxInvoicePayload', () => {
		it('should validate a minimal valid payload', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors).toHaveLength(0);
			expect(result.data.CustomerNumber).toBe('6');
			expect(result.data.InvoiceDate).toBe('2025-01-15');
			expect(result.data.DueDate).toBe('2025-02-14');
			expect(result.data.InvoiceRows).toHaveLength(1);
		});

		it('should require CustomerNumber', () => {
			const payload = {
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.field === 'CustomerNumber')).toBe(true);
		});

		it('should require InvoiceDate', () => {
			const payload = {
				CustomerNumber: '6',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.field === 'InvoiceDate')).toBe(true);
		});

		it('should require DueDate', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.field === 'DueDate')).toBe(true);
		});

		it('should require at least one InvoiceRow', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe('InvoiceRows');
		});

		it('should remove forbidden fields from payload', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				Total: 100, // Should be removed
				TotalVAT: 25, // Should be removed
				TotalExcludingVAT: 75, // Should be removed
				Project: 'PROJ-001', // Should be removed
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data).not.toHaveProperty('Total');
			expect(result.data).not.toHaveProperty('TotalVAT');
			expect(result.data).not.toHaveProperty('TotalExcludingVAT');
			expect(result.data).not.toHaveProperty('Project');
			expect(result.warnings).toContain('Total fields (Total, TotalVAT, TotalExcludingVAT) were removed (calculated automatically by Fortnox)');
			expect(result.warnings).toContain('Field "Project" was removed from payload (not allowed in Fortnox API v3)');
		});

		it('should sanitize all invoice rows', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test 1',
						Quantity: 1, // Should be renamed
						Price: 100,
					},
					{
						Description: 'Test 2',
						DeliveredQuantity: 2,
						Price: 200,
						Account: 3000, // Should be renamed
						Project: 'PROJ-001', // Should be removed
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors).toHaveLength(0);
			expect(result.data.InvoiceRows).toHaveLength(2);
			expect(result.data.InvoiceRows[0]?.DeliveredQuantity).toBe(1);
			expect(result.data.InvoiceRows[0]).not.toHaveProperty('Quantity');
			expect(result.data.InvoiceRows[1]?.AccountNumber).toBe(3000);
			expect(result.data.InvoiceRows[1]).not.toHaveProperty('Account');
			expect(result.data.InvoiceRows[1]).not.toHaveProperty('Project');
		});

		it('should preserve optional fields when valid', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				Currency: 'SEK',
				YourReference: 'Ref-123',
				OurReference: 'INT-456',
				VATIncluded: true,
				RotReducedInvoicingType: 'ROTRUT',
				ReverseChargeOnConstructionServices: false,
				Comments: 'Test comments',
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors).toHaveLength(0);
			expect(result.data.Currency).toBe('SEK');
			expect(result.data.YourReference).toBe('Ref-123');
			expect(result.data.OurReference).toBe('INT-456');
			expect(result.data.VATIncluded).toBe(true);
			expect(result.data.RotReducedInvoicingType).toBe('ROTRUT');
			expect(result.data.ReverseChargeOnConstructionServices).toBe(false);
			expect(result.data.Comments).toBe('Test comments');
		});

		it('should reject invalid RotReducedInvoicingType', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				RotReducedInvoicingType: 'INVALID', // Invalid value
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.warnings).toContain('Invalid RotReducedInvoicingType "INVALID" was removed');
			expect(result.data).not.toHaveProperty('RotReducedInvoicingType');
		});

		it('should collect errors from all invoice rows', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-01-15',
				DueDate: '2025-02-14',
				InvoiceRows: [
					{
						// Missing Description
						DeliveredQuantity: 1,
						Price: 100,
					},
					{
						Description: 'Test 2',
						// Missing DeliveredQuantity
						Price: 200,
					},
					{
						Description: 'Test 3',
						DeliveredQuantity: 3,
						// Missing Price
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((e) => e.field === 'InvoiceRows[0].Description')).toBe(true);
			expect(result.errors.some((e) => e.field === 'InvoiceRows[1].DeliveredQuantity')).toBe(true);
			expect(result.errors.some((e) => e.field === 'InvoiceRows[2].Price')).toBe(true);
		});

		it('should trim string fields', () => {
			const payload = {
				CustomerNumber: '  6  ',
				InvoiceDate: '  2025-01-15  ',
				DueDate: '  2025-02-14  ',
				InvoiceRows: [
					{
						Description: '  Test  ',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				Currency: '  SEK  ',
				YourReference: '  Ref-123  ',
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.errors).toHaveLength(0);
			expect(result.data.CustomerNumber).toBe('6');
			expect(result.data.InvoiceDate).toBe('2025-01-15');
			expect(result.data.DueDate).toBe('2025-02-14');
			// Description trimming is handled by sanitizeInvoiceRow
			expect(result.data.InvoiceRows[0]?.Description).toBe('Test');
			expect(result.data.Currency).toBe('SEK');
			expect(result.data.YourReference).toBe('Ref-123');
		});
	});
});

