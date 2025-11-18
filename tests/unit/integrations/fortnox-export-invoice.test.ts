/**
 * Unit tests for Fortnox invoice export function
 * Tests that invoice basis is correctly converted to Fortnox payload format
 */

import { buildFortnoxInvoicePayloadFromInvoiceBasis } from '@/lib/integrations/fortnox/export-invoice';
import type { InvoiceBasisRow } from '@/lib/integrations/fortnox/export-invoice';

describe('buildFortnoxInvoicePayloadFromInvoiceBasis', () => {
	const mockInvoiceBasis: InvoiceBasisRow = {
		id: 'basis-1',
		org_id: 'org-1',
		project_id: 'project-1',
		period_start: '2025-01-01',
		period_end: '2025-01-31',
		customer_id: 'customer-1',
		customer_snapshot: null,
		invoice_series: null,
		invoice_number: null,
		invoice_date: '2025-01-15',
		due_date: '2025-02-14',
		payment_terms_days: 30,
		ocr_ref: null,
		currency: 'SEK',
		fx_rate: null,
		our_ref: null,
		your_ref: null,
		reverse_charge_building: false,
		rot_rut_flag: false,
		worksite_address_json: null,
		worksite_id: null,
		invoice_address_json: null,
		delivery_address_json: null,
		cost_center: null,
		result_unit: null,
		lines_json: {
			lines: [],
			diary: [],
		},
		totals: null,
		locked: true,
		locked_by: 'user-1',
		locked_at: '2025-01-15T10:00:00Z',
		hash_signature: null,
		created_at: '2025-01-15T10:00:00Z',
		updated_at: '2025-01-15T10:00:00Z',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should throw error if invoice basis is not locked', async () => {
		const unlockedBasis = {
			...mockInvoiceBasis,
			locked: false,
		};

		await expect(
			buildFortnoxInvoicePayloadFromInvoiceBasis(unlockedBasis, {
				customerFortnoxNumber: '6',
			})
		).rejects.toThrow('Invoice basis must be locked before exporting to Fortnox');
	});

	it('should build minimal valid payload', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete 2025-01-15',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
						date: '2025-01-15',
						person: 'Johan Andersson',
						diary: 'Installed system',
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.CustomerNumber).toBe('6');
		expect(payload.InvoiceDate).toBe('2025-01-15');
		expect(payload.DueDate).toBe('2025-02-14');
		expect(payload.InvoiceRows).toHaveLength(1);
		expect(payload.InvoiceRows[0]?.Description).toContain('2025-01-15');
		expect(payload.InvoiceRows[0]?.Description).toContain('Johan Andersson');
		expect(payload.InvoiceRows[0]?.Description).toContain('Dagbok: Installed system');
		expect(payload.InvoiceRows[0]?.DeliveredQuantity).toBe(8);
		expect(payload.InvoiceRows[0]?.Price).toBe(500);
		expect(payload.InvoiceRows[0]?.VAT).toBe(25);
	});

	it('should exclude diary type lines', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
					},
					{
						type: 'diary', // Should be excluded
						description: 'Diary entry',
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.InvoiceRows).toHaveLength(1);
		expect(payload.InvoiceRows[0]?.Description).toBe('Arbete');
	});

	it('should format time entry descriptions correctly', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete 2025-01-15 - Installation',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
						date: '2025-01-15',
						person: 'Johan Andersson',
						diary: 'Worked on installation',
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		const description = payload.InvoiceRows[0]?.Description;
		expect(description).toContain('2025-01-15');
		expect(description).toContain('Johan Andersson');
		expect(description).toContain('Arbete 2025-01-15 - Installation');
		expect(description).toContain('Dagbok: Worked on installation');
	});

	it('should format material entry descriptions correctly', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'material',
						description: 'Electrical components',
						quantity: 2,
						unit: 'st',
						unit_price: 1000,
						vat_rate: 25,
						date: '2025-01-15',
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		const description = payload.InvoiceRows[0]?.Description;
		expect(description).toContain('2025-01-15');
		expect(description).toContain('Material: Electrical components');
		expect(payload.InvoiceRows[0]?.Unit).toBe('st');
	});

	it('should not include unit for time entries', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit: 'tim', // Should not be included
						unit_price: 500,
						vat_rate: 25,
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.InvoiceRows[0]).not.toHaveProperty('Unit');
	});

	it('should include optional fields when present', async () => {
		const basis = {
			...mockInvoiceBasis,
			currency: 'USD',
			our_ref: 'REF-123',
			your_ref: 'CUST-456',
			rot_rut_flag: true,
			reverse_charge_building: true,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
						discount: 10,
						account: '3000',
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.Currency).toBe('USD');
		expect(payload.OurReference).toBe('REF-123');
		expect(payload.YourReference).toBe('CUST-456');
		expect(payload.RotReducedInvoicingType).toBe('ROTRUT');
		expect(payload.ReverseChargeOnConstructionServices).toBe(true);
		expect(payload.InvoiceRows[0]?.Discount).toBe(10);
		expect(payload.InvoiceRows[0]?.DiscountType).toBe('PERCENT');
		// AccountNumber is not included - we let Fortnox use its default account
		expect(payload.InvoiceRows[0]).not.toHaveProperty('AccountNumber');
	});

	it('should not include forbidden fields', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		// Should not include total fields
		expect(payload).not.toHaveProperty('Total');
		expect(payload).not.toHaveProperty('TotalVAT');
		expect(payload).not.toHaveProperty('TotalExcludingVAT');
		expect(payload).not.toHaveProperty('Project');

		// Should not include forbidden fields in rows
		expect(payload.InvoiceRows[0]).not.toHaveProperty('Quantity');
		expect(payload.InvoiceRows[0]).not.toHaveProperty('Account');
		expect(payload.InvoiceRows[0]).not.toHaveProperty('AccountNumber'); // AccountNumber is not sent to Fortnox
		expect(payload.InvoiceRows[0]).not.toHaveProperty('Project');
		expect(payload.InvoiceRows[0]).not.toHaveProperty('ArticleNumber');
	});

	it('should use DeliveredQuantity not Quantity', async () => {
		const basis = {
			...mockInvoiceBasis,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.InvoiceRows[0]).toHaveProperty('DeliveredQuantity');
		expect(payload.InvoiceRows[0]?.DeliveredQuantity).toBe(8);
		expect(payload.InvoiceRows[0]).not.toHaveProperty('Quantity');
	});

	it('should handle date formatting correctly', async () => {
		const basis = {
			...mockInvoiceBasis,
			invoice_date: '2025-12-31T23:59:59Z',
			due_date: '2026-01-30T23:59:59Z',
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		expect(payload.InvoiceDate).toBe('2025-12-31');
		expect(payload.DueDate).toBe('2026-01-30');
	});

	it('should use default date if invoice_date is null', async () => {
		const basis = {
			...mockInvoiceBasis,
			invoice_date: null,
			due_date: null,
			lines_json: {
				lines: [
					{
						type: 'time',
						description: 'Arbete',
						quantity: 8,
						unit_price: 500,
						vat_rate: 25,
					},
				],
				diary: [],
			},
		};

		const payload = await buildFortnoxInvoicePayloadFromInvoiceBasis(basis, {
			customerFortnoxNumber: '6',
		});

		// Should use today's date in YYYY-MM-DD format
		const today = new Date().toISOString().split('T')[0];
		expect(payload.InvoiceDate).toBe(today);
		expect(payload.DueDate).toBe(today);
	});
});

