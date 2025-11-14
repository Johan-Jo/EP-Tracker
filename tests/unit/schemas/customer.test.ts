import { describe, expect, it } from '@jest/globals';
import { customerPayloadSchema, customerContactSchema } from '@/lib/schemas/customer';

describe('customerPayloadSchema', () => {
	describe('Company customer validation', () => {
		it('should validate valid company customer', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				company_name: 'Test AB',
				org_no: '5560160680',
				invoice_email: 'invoice@test.com',
			});

			expect(valid.success).toBe(true);
			if (valid.success) {
				expect(valid.data.type).toBe('COMPANY');
				expect(valid.data.company_name).toBe('Test AB');
			}
		});

		it('should reject company without org_no', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				company_name: 'Test AB',
				invoice_email: 'invoice@test.com',
			});

			expect(invalid.success).toBe(false);
		});

		it('should reject company without company_name', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				org_no: '5560160680',
				invoice_email: 'invoice@test.com',
			});

			expect(invalid.success).toBe(false);
		});

		it('should reject company without invoice_email', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				company_name: 'Test AB',
				org_no: '5560160680',
			});

			expect(invalid.success).toBe(false);
		});
	});

	describe('Private customer validation', () => {
		it('should validate valid private customer', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(valid.success).toBe(true);
			if (valid.success) {
				expect(valid.data.type).toBe('PRIVATE');
				expect(valid.data.first_name).toBe('Anna');
			}
		});

		it('should reject private without personal_identity_no', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(invalid.success).toBe(false);
		});

		it('should reject private without invoice_address_street', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				invoice_email: 'anna@example.com',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(invalid.success).toBe(false);
		});
	});

	describe('ROT validation', () => {
		it('should validate ROT customer with all required fields', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				rot_enabled: true,
				property_designation: 'TEST 1:1',
				ownership_share: 100,
				rot_consent_at: new Date('2025-01-01'),
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(valid.success).toBe(true);
		});

		it('should reject ROT without personal_identity_no', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				rot_enabled: true,
				property_designation: 'TEST 1:1',
				ownership_share: 100,
				rot_consent_at: new Date('2025-01-01'),
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(invalid.success).toBe(false);
		});

		it('should reject ROT without property_designation or housing_assoc', () => {
			const invalid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				rot_enabled: true,
				ownership_share: 100,
				rot_consent_at: new Date('2025-01-01'),
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(invalid.success).toBe(false);
		});

		it('should accept ROT with housing_assoc_org_no and apartment_no', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				rot_enabled: true,
				housing_assoc_org_no: '5560160680',
				apartment_no: '1234',
				ownership_share: 50,
				rot_consent_at: new Date('2025-01-01'),
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
			});

			expect(valid.success).toBe(true);
		});
	});

	describe('Optional fields', () => {
		it('should accept empty strings for optional fields as undefined', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				company_name: 'Test AB',
				org_no: '5560160680',
				invoice_email: 'invoice@test.com',
				bankgiro: '',
				plusgiro: '',
				reference: '',
				notes: '',
			});

			expect(valid.success).toBe(true);
			if (valid.success) {
				expect(valid.data.bankgiro).toBeUndefined();
				expect(valid.data.plusgiro).toBeUndefined();
				expect(valid.data.reference).toBeUndefined();
				expect(valid.data.notes).toBeUndefined();
			}
		});

		it('should accept null for optional fields', () => {
			const valid = customerPayloadSchema.safeParse({
				type: 'COMPANY',
				company_name: 'Test AB',
				org_no: '5560160680',
				invoice_email: 'invoice@test.com',
				bankgiro: null,
				plusgiro: null,
			});

			expect(valid.success).toBe(true);
		});
	});
});

describe('customerContactSchema', () => {
	it('should validate contact with required name', () => {
		const valid = customerContactSchema.safeParse({
			name: 'John Doe',
		});

		expect(valid.success).toBe(true);
	});

	it('should reject contact without name', () => {
		const invalid = customerContactSchema.safeParse({
			email: 'john@example.com',
		});

		expect(invalid.success).toBe(false);
	});

	it('should accept optional fields', () => {
		const valid = customerContactSchema.safeParse({
			name: 'John Doe',
			role: 'Manager',
			email: 'john@example.com',
			phone: '0701234567',
			reference_code: 'REF123',
			is_primary: true,
		});

		expect(valid.success).toBe(true);
		if (valid.success) {
			expect(valid.data.is_primary).toBe(true);
		}
	});
});

