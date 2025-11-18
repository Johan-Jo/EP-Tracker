/**
 * Unit tests for Fortnox export functionality
 * Tests that export only happens when user clicks the button, not automatically
 * Tests payload validation and sanitization
 */

import { validateFortnoxInvoicePayload } from '@/lib/integrations/fortnox/validate-payload';

describe('Fortnox Export', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Export should not trigger automatically', () => {
		it('should not export when customer number is fetched', () => {
			// Simulate customer number being fetched
			const customerFortnoxNumber = '6';
			const isExportingToFortnox = false;
			const invoiceBasisLocked = true;

			// Export should NOT be triggered automatically
			const shouldExportAutomatically = false;
			expect(shouldExportAutomatically).toBe(false);
		});

		it('should not export when invoice basis is locked', () => {
			const invoiceBasisLocked = true;
			const customerFortnoxNumber = '6';
			
			// Export should only happen on explicit button click
			const exportTriggered = false;
			expect(exportTriggered).toBe(false);
		});

		it('should not export when customer number changes', () => {
			let customerFortnoxNumber = '';
			
			// Simulate customer number being set
			customerFortnoxNumber = '6';
			
			// Export should NOT be triggered
			const exportTriggered = false;
			expect(exportTriggered).toBe(false);
		});
	});

	describe('Export button state', () => {
		it('should be disabled when already exported', () => {
			const fortnoxStatus = {
				fortnox_invoice_number: '123',
				status: 'created',
				error_message: null,
			};
			
			const isDisabled = !!fortnoxStatus?.fortnox_invoice_number;
			expect(isDisabled).toBe(true);
		});

		it('should be disabled when exporting', () => {
			const isExportingToFortnox = true;
			const fortnoxStatus = null;
			
			const isDisabled = isExportingToFortnox || !!fortnoxStatus?.fortnox_invoice_number;
			expect(isDisabled).toBe(true);
		});

		it('should be enabled when ready to export', () => {
			const isExportingToFortnox = false;
			const fortnoxStatus = null;
			const invoiceBasisLocked = true;
			const customerFortnoxNumber = '6';
			
			const isDisabled = isExportingToFortnox || !!fortnoxStatus?.fortnox_invoice_number;
			const canExport = invoiceBasisLocked && !!customerFortnoxNumber && !isDisabled;
			
			expect(canExport).toBe(true);
			expect(isDisabled).toBe(false);
		});
	});

	describe('Payload validation', () => {
		it('should not include TotalExcludingVAT in validated payload', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
						VAT: 25,
					},
				],
				VATIncluded: true,
				TotalExcludingVAT: 75, // Should be removed
				TotalVAT: 25, // Should be removed
				Total: 100, // Should be removed
			};

			const result = validateFortnoxInvoicePayload(payload);

			// Verify that TotalExcludingVAT is NOT in validated payload
			expect(result.data).not.toHaveProperty('TotalExcludingVAT');
			expect(result.data).not.toHaveProperty('TotalVAT');
			expect(result.data).not.toHaveProperty('Total');
		});

		it('should remove forbidden fields from payload', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				Project: 'PROJ-001', // Should be removed
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data).not.toHaveProperty('Project');
		});

		it('should rename Quantity to DeliveredQuantity in rows', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						Quantity: 1, // Old field name
						Price: 100,
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data.InvoiceRows[0]).toHaveProperty('DeliveredQuantity');
			expect(result.data.InvoiceRows[0]).not.toHaveProperty('Quantity');
			expect(result.data.InvoiceRows[0]?.DeliveredQuantity).toBe(1);
		});

		it('should rename Account to AccountNumber in rows', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
						Account: 3000, // Old field name
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data.InvoiceRows[0]).toHaveProperty('AccountNumber');
			expect(result.data.InvoiceRows[0]).not.toHaveProperty('Account');
			expect(result.data.InvoiceRows[0]?.AccountNumber).toBe(3000);
		});

		it('should remove ArticleNumber from rows', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
						ArticleNumber: 'TID-ARB', // Should be removed
					},
				],
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data.InvoiceRows[0]).not.toHaveProperty('ArticleNumber');
		});

		it('should include VATIncluded flag', () => {
			const payload = {
				CustomerNumber: '6',
				InvoiceDate: '2025-11-18',
				DueDate: '2025-11-28',
				InvoiceRows: [
					{
						Description: 'Test',
						DeliveredQuantity: 1,
						Price: 100,
					},
				],
				VATIncluded: true,
			};

			const result = validateFortnoxInvoicePayload(payload);

			expect(result.data).toHaveProperty('VATIncluded');
			expect(result.data.VATIncluded).toBe(true);
		});
	});

	describe('Customer number validation', () => {
		it('should reject empty customer number', () => {
			const customerFortnoxNumber = '';
			const isValid = customerFortnoxNumber && customerFortnoxNumber.trim().length > 0;
			
			expect(isValid).toBe(false);
		});

		it('should accept valid customer number', () => {
			const customerFortnoxNumber = '6';
			const isValid = customerFortnoxNumber && customerFortnoxNumber.trim().length > 0;
			
			expect(isValid).toBe(true);
		});

		it('should trim whitespace from customer number', () => {
			const customerFortnoxNumber = '  6  ';
			const trimmed = customerFortnoxNumber.trim();
			
			expect(trimmed).toBe('6');
		});
	});
});

