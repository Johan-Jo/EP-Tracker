import { randomUUID } from 'crypto';
import {
	customerPayloadSchema,
	type CustomerPayload,
	invoiceMethodEnum,
	type Customer,
} from '@/lib/schemas/customer';
import {
	normalizeSwedishOrganizationNumber,
	normalizeSwedishPersonalIdentityNumber,
} from '@/lib/utils/swedish';

const toNullable = <T>(value: T | null | undefined): T | null =>
	value === undefined ? null : (value ?? null);

export const generateCustomerNumber = () =>
	`C-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;

export const prepareCustomerFields = (payload: CustomerPayload) => {
	const normalizedOrgNo = payload.org_no
		? normalizeSwedishOrganizationNumber(payload.org_no)
		: null;
	const normalizedPersonalId = payload.personal_identity_no
		? normalizeSwedishPersonalIdentityNumber(payload.personal_identity_no)
		: null;

	if (payload.type === 'COMPANY' && !normalizedOrgNo) {
		if (!payload.org_no) {
			throw new Error('Organisationsnummer krävs för företagskund');
		}
		throw new Error('Ogiltigt organisationsnummer');
	}

	if (
		(payload.type === 'PRIVATE' || payload.rot_enabled) &&
		!normalizedPersonalId
	) {
		if (!payload.personal_identity_no) {
			throw new Error('Personnummer krävs för privatkund');
		}
		throw new Error('Ogiltigt personnummer');
	}

	return {
		type: payload.type,
		company_name: toNullable(payload.company_name),
		org_no: toNullable(normalizedOrgNo),
		vat_no: toNullable(payload.vat_no),
		f_tax: payload.f_tax ?? false,
		first_name: toNullable(payload.first_name),
		last_name: toNullable(payload.last_name),
		personal_identity_no: toNullable(normalizedPersonalId),
		rot_enabled: payload.rot_enabled ?? false,
		property_designation: toNullable(payload.property_designation),
		housing_assoc_org_no: toNullable(payload.housing_assoc_org_no),
		apartment_no: toNullable(payload.apartment_no),
		ownership_share:
			payload.ownership_share === undefined
				? null
				: Number(payload.ownership_share.toFixed(2)),
		rot_consent_at: payload.rot_consent_at
			? payload.rot_consent_at.toISOString()
			: null,
		invoice_email: toNullable(payload.invoice_email),
		invoice_method: payload.invoice_method ?? invoiceMethodEnum.Enum.EMAIL,
		peppol_id: toNullable(payload.peppol_id),
		gln: toNullable(payload.gln),
		terms: payload.terms ?? null,
		default_vat_rate: payload.default_vat_rate ?? 25,
		bankgiro: toNullable(payload.bankgiro),
		plusgiro: toNullable(payload.plusgiro),
		reference: toNullable(payload.reference),
		invoice_address_street: toNullable(payload.invoice_address_street),
		invoice_address_zip: toNullable(payload.invoice_address_zip),
		invoice_address_city: toNullable(payload.invoice_address_city),
		invoice_address_country: toNullable(payload.invoice_address_country),
		delivery_address_street: toNullable(payload.delivery_address_street),
		delivery_address_zip: toNullable(payload.delivery_address_zip),
		delivery_address_city: toNullable(payload.delivery_address_city),
		delivery_address_country: toNullable(payload.delivery_address_country),
		phone_mobile: toNullable(payload.phone_mobile),
		notes: toNullable(payload.notes),
		is_archived: payload.is_archived ?? false,
	};
};

export const buildCustomerInsert = ({
	payload,
	orgId,
	userId,
}: {
	payload: CustomerPayload;
	orgId: string;
	userId: string;
}) => {
	const base = prepareCustomerFields(payload);

	return {
		org_id: orgId,
		customer_no: payload.customer_no ?? generateCustomerNumber(),
		...base,
		created_by: userId,
		updated_by: userId,
	};
};

export const buildCustomerUpdate = ({
	payload,
	userId,
}: {
	payload: CustomerPayload;
	userId: string;
}) => {
	const base = prepareCustomerFields(payload);

	return {
		...base,
		...(payload.customer_no !== undefined
			? { customer_no: payload.customer_no ?? null }
			: {}),
		updated_by: userId,
	};
};

export const parseCustomerPayload = (data: unknown) =>
	customerPayloadSchema.parse(data);

export const customerToPayload = (customer: Customer): CustomerPayload => ({
	type: customer.type,
	customer_no: customer.customer_no,
	company_name: customer.company_name ?? '',
	org_no: customer.org_no ?? '',
	vat_no: customer.vat_no ?? '',
	f_tax: customer.f_tax ?? false,
	first_name: customer.first_name ?? '',
	last_name: customer.last_name ?? '',
	personal_identity_no: customer.personal_identity_no ?? '',
	rot_enabled: customer.rot_enabled ?? false,
	property_designation: customer.property_designation ?? '',
	housing_assoc_org_no: customer.housing_assoc_org_no ?? '',
	apartment_no: customer.apartment_no ?? '',
	ownership_share:
		customer.ownership_share === null || customer.ownership_share === undefined
			? undefined
			: customer.ownership_share,
	rot_consent_at: customer.rot_consent_at ? new Date(customer.rot_consent_at) : undefined,
	invoice_email: customer.invoice_email ?? '',
	invoice_method: customer.invoice_method ?? invoiceMethodEnum.Enum.EMAIL,
	peppol_id: customer.peppol_id ?? '',
	gln: customer.gln ?? '',
	terms: customer.terms ?? undefined,
	default_vat_rate: customer.default_vat_rate ?? 25,
	bankgiro: customer.bankgiro ?? '',
	plusgiro: customer.plusgiro ?? '',
	reference: customer.reference ?? '',
	invoice_address_street: customer.invoice_address_street ?? '',
	invoice_address_zip: customer.invoice_address_zip ?? '',
	invoice_address_city: customer.invoice_address_city ?? '',
	invoice_address_country: customer.invoice_address_country ?? 'Sverige',
	delivery_address_street: customer.delivery_address_street ?? '',
	delivery_address_zip: customer.delivery_address_zip ?? '',
	delivery_address_city: customer.delivery_address_city ?? '',
	delivery_address_country: customer.delivery_address_country ?? 'Sverige',
	phone_mobile: customer.phone_mobile ?? '',
	notes: customer.notes ?? '',
	is_archived: customer.is_archived ?? false,
});


