import { describe, expect, it } from '@jest/globals';
import {
	buildCustomerInsert,
	buildCustomerUpdate,
	customerToPayload,
	generateCustomerNumber,
	parseCustomerPayload,
	prepareCustomerFields,
} from '@/lib/services/customer-mapper';

describe('customer-mapper', () => {
	it('generates deterministic length customer number', () => {
		const number = generateCustomerNumber();
		expect(number).toMatch(/^C-[A-Z0-9]{8}$/);
	});

	it('parses and normalizes organization numbers', () => {
		const payload = parseCustomerPayload({
			type: 'COMPANY',
			company_name: 'Example AB',
			org_no: '556016-0680',
			invoice_email: 'invoice@example.com',
		});

		const prepared = prepareCustomerFields(payload);
		expect(prepared.org_no).toBe('5560160680');
	});

	it('throws when organization number is missing for company', () => {
		expect(() =>
			prepareCustomerFields(
				parseCustomerPayload({
					type: 'COMPANY',
					company_name: 'Example AB',
				})
			)
		).toThrow('Organisationsnummer krävs för företagskund');
	});

	it('throws when personal identity number missing for private customer', () => {
		expect(() =>
			prepareCustomerFields(
				parseCustomerPayload({
					type: 'PRIVATE',
					first_name: 'Anna',
					last_name: 'Andersson',
				})
			)
		).toThrow('Personnummer krävs för privatkund');
	});

	it('builds insert payload including org and user id', () => {
		const payload = parseCustomerPayload({
			type: 'COMPANY',
			company_name: 'Example AB',
			org_no: '5560160680',
		});

		const insert = buildCustomerInsert({
			payload,
			orgId: 'org-123',
			userId: 'user-456',
		});

		expect(insert).toMatchObject({
			org_id: 'org-123',
			created_by: 'user-456',
			updated_by: 'user-456',
			company_name: 'Example AB',
			org_no: '5560160680',
		});
		expect(insert.customer_no).toMatch(/^C-/);
	});

	it('builds update payload and preserves customer number override', () => {
		const payload = parseCustomerPayload({
			type: 'COMPANY',
			company_name: 'Example AB',
			org_no: '5560160680',
			customer_no: 'C-EXISTING',
		});

		const update = buildCustomerUpdate({
			payload,
			userId: 'user-456',
		});

		expect(update).toMatchObject({
			company_name: 'Example AB',
			org_no: '5560160680',
			updated_by: 'user-456',
		});
	});

	it('maps customer record to payload defaults', () => {
		const payload = customerToPayload({
			id: 'cust-1',
			org_id: 'org',
			customer_no: 'C-123',
			type: 'COMPANY',
			company_name: 'Example AB',
			org_no: '5560160680',
			vat_no: null,
			f_tax: true,
			first_name: null,
			last_name: null,
			personal_identity_no: null,
			rot_enabled: false,
			property_designation: null,
			housing_assoc_org_no: null,
			apartment_no: null,
			ownership_share: null,
			rot_consent_at: null,
			invoice_email: 'invoice@example.com',
			invoice_method: 'EMAIL',
			peppol_id: null,
			gln: null,
			terms: 30,
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
			phone_mobile: null,
			notes: null,
			is_archived: false,
			created_by: 'user',
			updated_by: 'user',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		expect(payload.customer_no).toBe('C-123');
		expect(payload.company_name).toBe('Example AB');
		expect(payload.org_no).toBe('5560160680');
		expect(payload.invoice_email).toBe('invoice@example.com');
		expect(payload.default_vat_rate).toBe(25);
	});
});


