import {
	buildSubcontractorInsert,
	buildSubcontractorUpdate,
	subcontractorToPayload,
	generateSubcontractorNumber,
	parseSubcontractorPayload,
	prepareSubcontractorFields,
} from '@/lib/services/subcontractor-mapper';
import { type Subcontractor } from '@/lib/schemas/subcontractor';

describe('subcontractor-mapper', () => {
	describe('generateSubcontractorNumber', () => {
		it('generates subcontractor number with correct format', () => {
			const number = generateSubcontractorNumber();
			expect(number).toMatch(/^UE-\d{4}-\d{4}$/);
			expect(number).toBeTruthy();
		});
	});

	describe('parseSubcontractorPayload', () => {
		it('parses valid subcontractor payload', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = parseSubcontractorPayload(payload);
			expect(result.company_name).toBe('Test AB');
			expect(result.org_no).toBe('5561234567');
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
		});

		it('throws error for invalid payload', () => {
			const payload = {
				// Missing required fields
			};

			expect(() => parseSubcontractorPayload(payload)).toThrow();
		});
	});

	describe('prepareSubcontractorFields', () => {
		it('prepares fields for database insertion', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				email: 'info@test.se',
				phone_mobile: '070-123 45 67',
				invoice_method: 'EMAIL' as const,
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = prepareSubcontractorFields(payload);
			expect(result.company_name).toBe('Test AB');
			expect(result.org_no).toBe('5561234567');
			expect(result.email).toBe('info@test.se');
			expect(result.phone_mobile).toBe('070-123 45 67');
			expect(result.invoice_method).toBe('EMAIL');
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
		});

		it('normalizes organization number', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '556123-4567', // With dash
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = prepareSubcontractorFields(payload);
			// Normalization should remove dashes
			expect(result.org_no).toBeTruthy();
			expect(result.org_no).not.toContain('-');
		});

		it('handles optional fields as null', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = prepareSubcontractorFields(payload);
			expect(result.vat_no).toBeNull();
			expect(result.contact_person_name).toBeNull();
			expect(result.email).toBeNull();
		});

		it('throws error if org_no is missing', () => {
			const payload = {
				company_name: 'Test AB',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			expect(() => prepareSubcontractorFields(payload)).toThrow('Organisationsnummer');
		});
	});

	describe('subcontractorToPayload', () => {
		it('converts subcontractor to payload', () => {
			const subcontractor: Subcontractor = {
				id: 'sub-1',
				org_id: 'org-1',
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
				invoice_method: 'EMAIL',
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
				is_archived: false,
				created_by: 'user-1',
				updated_by: 'user-1',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			};

			const result = subcontractorToPayload(subcontractor);
			expect(result.company_name).toBe('Test AB');
			expect(result.org_no).toBe('5561234567');
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.vat_no).toBe('SE556123456701');
		});

		it('converts null values to undefined', () => {
			const subcontractor: Subcontractor = {
				id: 'sub-1',
				org_id: 'org-1',
				subcontractor_no: 'UE-2025-0001',
				company_name: 'Test AB',
				org_no: '5561234567',
				vat_no: null,
				f_tax: false,
				contact_person_name: null,
				contact_person_phone: null,
				email: null,
				phone_mobile: null,
				phone_work: null,
				invoice_email: 'faktura@test.se',
				invoice_method: 'EMAIL',
				peppol_id: null,
				gln: null,
				terms: null,
				default_vat_rate: 25,
				bankgiro: null,
				plusgiro: null,
				reference: null,
				invoice_address_street: null,
				invoice_address_zip: null,
				invoice_address_city: null,
				invoice_address_country: null,
				delivery_address_street: null,
				delivery_address_zip: null,
				delivery_address_city: null,
				delivery_address_country: null,
				notes: null,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				is_archived: false,
				created_by: null,
				updated_by: null,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			};

			const result = subcontractorToPayload(subcontractor);
			expect(result.vat_no).toBeUndefined();
			expect(result.contact_person_name).toBeUndefined();
			expect(result.email).toBeUndefined();
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
		});
	});

	describe('buildSubcontractorInsert', () => {
		it('builds insert payload with org and user IDs', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_email: 'faktura@test.se',
				invoice_method: 'EMAIL' as const,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = buildSubcontractorInsert({
				payload,
				orgId: 'org-1',
				userId: 'user-1',
			});

			expect(result.org_id).toBe('org-1');
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.created_by).toBe('user-1');
			expect(result.updated_by).toBe('user-1');
			expect(result.subcontractor_no).toBeTruthy();
		});

		it('generates subcontractor number if not provided', () => {
			const payload = {
				company_name: 'Test AB',
				org_no: '5561234567',
				invoice_method: 'EMAIL' as const,
				invoice_email: 'faktura@test.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = buildSubcontractorInsert({
				payload,
				orgId: 'org-1',
				userId: 'user-1',
			});

			expect(result.subcontractor_no).toMatch(/^UE-\d{4}-\d{4}$/);
		});
	});

	describe('buildSubcontractorUpdate', () => {
		it('builds update payload with user ID', () => {
			const payload = {
				company_name: 'Updated AB',
				org_no: '5561234567',
				invoice_method: 'EMAIL' as const,
				invoice_email: 'faktura@updated.se',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
			};

			const result = buildSubcontractorUpdate({
				payload,
				userId: 'user-1',
			});

			expect(result.company_name).toBe('Updated AB');
			expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.updated_by).toBe('user-1');
		});
	});
});

