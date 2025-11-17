import type { FortnoxCustomer } from './client';
import type { CustomerPayload } from '@/lib/schemas/customer';

/**
 * Map Fortnox Customer to EP-Tracker CustomerPayload
 * @param fortnoxCustomer Fortnox customer data
 * @returns EP-Tracker customer payload
 */
export function mapFortnoxCustomerToEPTracker(
	fortnoxCustomer: FortnoxCustomer
): CustomerPayload {
	// Determine customer type
	// If Type is explicitly set, use it
	// Otherwise, check if OrganisationNumber is a personal identity number (YYYYMMDD-XXXX format)
	let type: 'COMPANY' | 'PRIVATE' = fortnoxCustomer.Type || 'COMPANY';
	
	// If Type is not set, check if OrganisationNumber looks like a personal identity number
	if (!fortnoxCustomer.Type && fortnoxCustomer.OrganisationNumber) {
		// Personal identity numbers have format YYYYMMDD-XXXX (10 digits + dash + 4 digits)
		const personalIdPattern = /^\d{8}-\d{4}$/;
		if (personalIdPattern.test(fortnoxCustomer.OrganisationNumber)) {
			console.log(`[Fortnox Mapper] Detected PRIVATE customer by personal ID format: ${fortnoxCustomer.OrganisationNumber}`);
			type = 'PRIVATE';
		}
	}
	
	console.log(`[Fortnox Mapper] Customer ${fortnoxCustomer.CustomerNumber} (${fortnoxCustomer.Name}): Type=${fortnoxCustomer.Type || 'undefined'}, Detected=${type}, OrgNo=${fortnoxCustomer.OrganisationNumber || 'none'}`);

	// Map invoice method based on Fortnox settings
	let invoiceMethod: 'EMAIL' | 'EFAKTURA' | 'PAPER' = 'EMAIL';
	if (fortnoxCustomer.DefaultDeliveryType) {
		const deliveryType = fortnoxCustomer.DefaultDeliveryType.toLowerCase();
		if (deliveryType.includes('efaktura') || deliveryType.includes('e-faktura')) {
			invoiceMethod = 'EFAKTURA';
		} else if (deliveryType.includes('papper') || deliveryType.includes('paper')) {
			invoiceMethod = 'PAPER';
		}
	}

	// Combine address fields
	const address1 = fortnoxCustomer.Address1 || '';
	const address2 = fortnoxCustomer.Address2 || '';
	const invoiceAddressStreet = [address1, address2].filter(Boolean).join(', ') || undefined;

	// Extract VAT rate from default templates or use default
	const defaultVatRate = 25; // Default Swedish VAT

	// Map phone numbers (use Phone1 as primary, Phone2 as mobile if available)
	const phoneMobile = fortnoxCustomer.Phone2 || fortnoxCustomer.Phone1 || undefined;

	// Build payload based on customer type
	if (type === 'PRIVATE') {
		// For private customers, try to split name into first/last
		const nameParts = (fortnoxCustomer.Name || '').trim().split(/\s+/);
		const firstName = nameParts[0] || undefined;
		const lastName = nameParts.slice(1).join(' ') || undefined;

		// For PRIVATE customers, Fortnox stores personal identity number in OrganisationNumber field
		// This is different from COMPANY customers where OrganisationNumber is the org number
		const personalIdentityNo = fortnoxCustomer.OrganisationNumber || undefined;

		return {
			type: 'PRIVATE',
			customer_no: fortnoxCustomer.CustomerNumber,
			first_name: firstName,
			last_name: lastName,
			personal_identity_no: personalIdentityNo,
			rot_enabled: false,
			invoice_email: fortnoxCustomer.EmailInvoice || fortnoxCustomer.Email || undefined,
			invoice_method: invoiceMethod,
			peppol_id: undefined,
			gln: fortnoxCustomer.GLN || undefined,
			terms: fortnoxCustomer.DefaultPaymentTerms || undefined,
			default_vat_rate: defaultVatRate,
			bankgiro: fortnoxCustomer.BankAccountNumber || undefined,
			plusgiro: undefined,
			reference: fortnoxCustomer.YourReference || fortnoxCustomer.OurReference || undefined,
			fortnox_customer_number: fortnoxCustomer.CustomerNumber,
			invoice_address_street: invoiceAddressStreet,
			invoice_address_zip: fortnoxCustomer.ZipCode || undefined,
			invoice_address_city: fortnoxCustomer.City || undefined,
			invoice_address_country: fortnoxCustomer.Country || 'Sverige',
			phone_mobile: phoneMobile,
			notes: fortnoxCustomer.Notes || undefined,
			// Only archive if Active is explicitly false
			// If Active is undefined or true, keep customer active
			is_archived: fortnoxCustomer.Active === false,
		};
	} else {
		// For company customers
		// All Fortnox company customers should have OrganisationNumber
		return {
			type: 'COMPANY',
			customer_no: fortnoxCustomer.CustomerNumber,
			company_name: fortnoxCustomer.Name || undefined,
			org_no: fortnoxCustomer.OrganisationNumber || undefined,
			vat_no: fortnoxCustomer.VATNumber || undefined,
			f_tax: false,
			contact_person_name: undefined,
			contact_person_phone: fortnoxCustomer.Phone1 || undefined,
			invoice_email: fortnoxCustomer.EmailInvoice || fortnoxCustomer.Email || undefined,
			invoice_method: invoiceMethod,
			peppol_id: undefined,
			gln: fortnoxCustomer.GLN || undefined,
			terms: fortnoxCustomer.DefaultPaymentTerms || undefined,
			default_vat_rate: defaultVatRate,
			bankgiro: fortnoxCustomer.BankAccountNumber || undefined,
			plusgiro: undefined,
			reference: fortnoxCustomer.YourReference || fortnoxCustomer.OurReference || undefined,
			fortnox_customer_number: fortnoxCustomer.CustomerNumber,
			invoice_address_street: invoiceAddressStreet,
			invoice_address_zip: fortnoxCustomer.ZipCode || undefined,
			invoice_address_city: fortnoxCustomer.City || undefined,
			invoice_address_country: fortnoxCustomer.Country || 'Sverige',
			delivery_address_street: undefined,
			delivery_address_zip: undefined,
			delivery_address_city: undefined,
			delivery_address_country: undefined,
			phone_mobile: phoneMobile,
			notes: fortnoxCustomer.Notes || undefined,
			// Only archive if Active is explicitly false
			// If Active is undefined or true, keep customer active
			is_archived: fortnoxCustomer.Active === false,
		};
	}
}

