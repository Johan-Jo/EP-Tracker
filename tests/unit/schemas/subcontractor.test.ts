import { subcontractorPayloadSchema } from '@/lib/schemas/subcontractor';
import { z } from 'zod';

describe('subcontractorPayloadSchema', () => {
	describe('valid payloads', () => {
		it('accepts minimal valid payload with user_id', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			if (!result.success) {
				console.log('Validation errors:', result.error?.errors || result.error);
			}
			expect(result.success).toBe(true);
		});

		it('accepts full payload with all fields', () => {
			const payload = {
				subcontractor_no: 'UE-2025-0001',
				company_name: 'Test AB',
				org_no: '5561234567',
				vat_no: 'SE556123456701',
				f_tax: true,
				contact_person_name: 'Anna Andersson',
				contact_person_phone: '070-123 45 67',
				email: 'info@test.se',
				phone_mobile: '070-123 45 67',
				phone_work: '08-123 45 67',
				invoice_email: 'faktura@test.se',
				invoice_method: 'EMAIL' as const,
				peppol_id: '123456789',
				gln: '1234567890123',
				terms: 30,
				default_vat_rate: 25,
				bankgiro: '123-4567',
				plusgiro: '12 34 56-7',
				reference: 'REF123',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
				invoice_address_country: 'Sverige',
				delivery_address_street: 'Leveransgatan 2',
				delivery_address_zip: '54321',
				delivery_address_city: 'Göteborg',
				delivery_address_country: 'Sverige',
				notes: 'Some notes',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			if (!result.success) {
				console.log('Validation errors:', result.error?.errors || result.error);
			}
			expect(result.success).toBe(true);
		});

		it('accepts payload with EFAKTURA invoice method', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_method: 'EFAKTURA' as const,
				peppol_id: '123456789',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});

		it('accepts payload with PAPER invoice method', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_method: 'PAPER' as const,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});
	});

	describe('required fields', () => {
		it('rejects payload without company_name', () => {
			const payload = {
				org_no: '5561234567',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('company_name'))).toBe(true);
			}
		});

		it('rejects payload without org_no', () => {
			const payload = {
				company_name: 'Test AB',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('org_no'))).toBe(true);
			}
		});

		it('rejects payload without user_id', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('user_id'))).toBe(true);
			}
		});

		it('rejects invalid user_id format', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				user_id: 'invalid-uuid',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('user_id'))).toBe(true);
			}
		});

		it('requires invoice_email when invoice_method is EMAIL', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_method: 'EMAIL' as const,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				// Missing invoice_email
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('invoice_email'))).toBe(true);
			}
		});
	});

	describe('organization number validation', () => {
		it('rejects invalid organization number', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '123', // Too short
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(false);
			if (!result.success && result.error && Array.isArray(result.error.errors)) {
				expect(result.error.errors.some((e) => e.path.includes('org_no'))).toBe(true);
			}
		});
	});

	describe('optional fields', () => {
		it('accepts payload with optional fields as undefined', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				vat_no: undefined,
				contact_person_name: undefined,
				email: undefined,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});

		it('accepts payload with empty strings converted to undefined', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				vat_no: '',
				contact_person_name: '',
				email: '',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = subcontractorPayloadSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});
	});

	describe('vat rate validation', () => {
		it('accepts valid VAT rates', () => {
			const validRates = [0, 6, 12, 25];
			for (const rate of validRates) {
				const payload = {
					company_name: 'Test AB',
					org_no: '5561234567',
					invoice_email: 'faktura@test.se',
					default_vat_rate: rate,
					user_id: '550e8400-e29b-41d4-a716-446655440000',
				};

				const result = subcontractorPayloadSchema.safeParse(payload);
				expect(result.success).toBe(true);
			}
		});
	});
});
