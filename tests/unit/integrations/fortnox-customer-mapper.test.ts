import { mapFortnoxCustomerToEPTracker } from '@/lib/integrations/fortnox/customer-mapper';
import type { FortnoxCustomer } from '@/lib/integrations/fortnox/client';

describe('Fortnox Customer Mapper', () => {
	describe('mapFortnoxCustomerToEPTracker', () => {
		it('should map COMPANY customer correctly', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '1001',
				Name: 'Test AB',
				Address1: 'Testgatan 1',
				Address2: 'Lgh 2',
				ZipCode: '12345',
				City: 'Stockholm',
				Country: 'Sverige',
				Phone1: '08-123456',
				Phone2: '070-1234567',
				Email: 'info@test.se',
				EmailInvoice: 'invoice@test.se',
				OrganisationNumber: '5560160680',
				VATNumber: 'SE556016068001',
				GLN: '1234567890123',
				YourReference: 'Ref-123',
				DefaultPaymentTerms: 30,
				BankAccountNumber: '123-4567',
				Active: true,
				Type: 'COMPANY',
				Notes: 'Test notes',
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);

			expect(result.type).toBe('COMPANY');
			expect(result.customer_no).toBe('1001');
			expect(result.company_name).toBe('Test AB');
			expect(result.org_no).toBe('5560160680');
			expect(result.vat_no).toBe('SE556016068001');
			expect(result.invoice_email).toBe('invoice@test.se');
			expect(result.invoice_address_street).toBe('Testgatan 1, Lgh 2');
			expect(result.invoice_address_zip).toBe('12345');
			expect(result.invoice_address_city).toBe('Stockholm');
			expect(result.invoice_address_country).toBe('Sverige');
			expect(result.phone_mobile).toBe('070-1234567');
			expect(result.contact_person_phone).toBe('08-123456');
			expect(result.terms).toBe(30);
			expect(result.bankgiro).toBe('123-4567');
			expect(result.gln).toBe('1234567890123');
			expect(result.reference).toBe('Ref-123');
			expect(result.fortnox_customer_number).toBe('1001');
			expect(result.notes).toBe('Test notes');
			expect(result.is_archived).toBe(false);
		});

		it('should map PRIVATE customer correctly', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '2001',
				Name: 'Anna Andersson',
				Address1: 'Privatgatan 5',
				ZipCode: '54321',
				City: 'Göteborg',
				Country: 'Sverige',
				Phone1: '031-123456',
				Email: 'anna@example.com',
				EmailInvoice: 'anna@example.com',
				DefaultPaymentTerms: 14,
				Active: true,
				Type: 'PRIVATE',
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);

			expect(result.type).toBe('PRIVATE');
			expect(result.customer_no).toBe('2001');
			expect(result.first_name).toBe('Anna');
			expect(result.last_name).toBe('Andersson');
			expect(result.invoice_email).toBe('anna@example.com');
			expect(result.invoice_address_street).toBe('Privatgatan 5');
			expect(result.invoice_address_zip).toBe('54321');
			expect(result.invoice_address_city).toBe('Göteborg');
			expect(result.phone_mobile).toBe('031-123456');
			expect(result.terms).toBe(14);
			expect(result.fortnox_customer_number).toBe('2001');
			expect(result.is_archived).toBe(false);
		});

		it('should handle missing optional fields', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '3001',
				Name: 'Minimal AB',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);

			expect(result.type).toBe('COMPANY');
			expect(result.customer_no).toBe('3001');
			expect(result.company_name).toBe('Minimal AB');
			expect(result.invoice_address_country).toBe('Sverige'); // Default
			expect(result.default_vat_rate).toBe(25); // Default
			expect(result.invoice_method).toBe('EMAIL'); // Default
		});

		it('should map invoice method from DefaultDeliveryType', () => {
			const efakturaCustomer: FortnoxCustomer = {
				CustomerNumber: '4001',
				Name: 'E-faktura AB',
				DefaultDeliveryType: 'E-faktura',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(efakturaCustomer);
			expect(result.invoice_method).toBe('EFAKTURA');

			const paperCustomer: FortnoxCustomer = {
				CustomerNumber: '4002',
				Name: 'Papper AB',
				DefaultDeliveryType: 'Papper',
				Type: 'COMPANY',
				Active: true,
			};

			const result2 = mapFortnoxCustomerToEPTracker(paperCustomer);
			expect(result2.invoice_method).toBe('PAPER');
		});

		it('should handle inactive customers', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '5001',
				Name: 'Inactive AB',
				Type: 'COMPANY',
				Active: false,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.is_archived).toBe(true);
		});

		it('should combine Address1 and Address2 correctly', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '6001',
				Name: 'Address Test AB',
				Address1: 'Gatan 1',
				Address2: 'Lgh 5',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.invoice_address_street).toBe('Gatan 1, Lgh 5');
		});

		it('should handle single name for PRIVATE customer', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '7001',
				Name: 'SingleName',
				Type: 'PRIVATE',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.first_name).toBe('SingleName');
			expect(result.last_name).toBeUndefined();
		});

		it('should use EmailInvoice over Email', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '8001',
				Name: 'Email Test AB',
				Email: 'info@test.se',
				EmailInvoice: 'invoice@test.se',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.invoice_email).toBe('invoice@test.se');
		});

		it('should fallback to Email if EmailInvoice is missing', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '8002',
				Name: 'Email Fallback AB',
				Email: 'info@test.se',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.invoice_email).toBe('info@test.se');
		});

		it('should use Phone2 as phone_mobile if available', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '9001',
				Name: 'Phone Test AB',
				Phone1: '08-111111',
				Phone2: '070-222222',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.phone_mobile).toBe('070-222222');
		});

		it('should fallback to Phone1 if Phone2 is missing', () => {
			const fortnoxCustomer: FortnoxCustomer = {
				CustomerNumber: '9002',
				Name: 'Phone Fallback AB',
				Phone1: '08-111111',
				Type: 'COMPANY',
				Active: true,
			};

			const result = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
			expect(result.phone_mobile).toBe('08-111111');
		});
	});
});

