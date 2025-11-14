import { randomUUID } from 'crypto';
import {
	subcontractorPayloadSchema,
	type SubcontractorPayload,
	invoiceMethodEnum,
	type Subcontractor,
} from '@/lib/schemas/subcontractor';
import { normalizeSwedishOrganizationNumber } from '@/lib/utils/swedish';

const toNullable = <T>(value: T | null | undefined): T | null =>
	value === undefined ? null : (value ?? null);

/**
 * Generate a unique subcontractor number
 * Format: UE-YYYY-XXXX (e.g., UE-2025-0001)
 */
export function generateSubcontractorNumber(): string {
	const year = new Date().getFullYear();
	// In a real implementation, you'd query the database for the next number
	// For now, we'll use a timestamp-based approach
	const random = Math.floor(Math.random() * 10000);
	return `UE-${year}-${random.toString().padStart(4, '0')}`;
}

/**
 * Generate subcontractor number on client side (for form pre-fill)
 */
export function generateSubcontractorNumberClient(): string {
	try {
		return `UE-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;
	} catch {
		return `UE-${new Date().getFullYear()}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
	}
}

/**
 * Parse and validate subcontractor payload from request
 */
export const parseSubcontractorPayload = (data: unknown) =>
	subcontractorPayloadSchema.parse(data);

/**
 * Prepare subcontractor fields for database insertion/update
 * Normalizes data and handles null/undefined values
 */
export const prepareSubcontractorFields = (payload: SubcontractorPayload) => {
	const normalizedOrgNo = payload.org_no
		? normalizeSwedishOrganizationNumber(payload.org_no)
		: null;

	if (!normalizedOrgNo) {
		if (!payload.org_no) {
			throw new Error('Organisationsnummer krävs för underentreprenör');
		}
		throw new Error('Ogiltigt organisationsnummer');
	}

	return {
		company_name: payload.company_name || '',
		org_no: normalizedOrgNo,
		vat_no: toNullable(payload.vat_no),
		f_tax: payload.f_tax ?? false,
		contact_person_name: toNullable(payload.contact_person_name),
		contact_person_phone: toNullable(payload.contact_person_phone),
		email: toNullable(payload.email),
		phone_mobile: toNullable(payload.phone_mobile),
		phone_work: toNullable(payload.phone_work),
		invoice_email: toNullable(payload.invoice_email),
		invoice_method: payload.invoice_method ?? 'EMAIL',
		peppol_id: toNullable(payload.peppol_id),
		gln: toNullable(payload.gln),
		terms: payload.terms ?? null,
		default_vat_rate: payload.default_vat_rate ?? 25,
		hourly_rate_sek: payload.hourly_rate_sek ?? null,
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
		notes: toNullable(payload.notes),
		user_id: payload.user_id, // Required field
		is_archived: payload.is_archived ?? false,
	};
};

/**
 * Convert Subcontractor database record to SubcontractorPayload for form defaults
 */
export const subcontractorToPayload = (subcontractor: Subcontractor): SubcontractorPayload => {
	const toUndefined = (value: string | null | undefined): string | undefined => {
		return value === null || value === undefined || value === '' ? undefined : value;
	};

	return {
		subcontractor_no: subcontractor.subcontractor_no,
		company_name: subcontractor.company_name || '',
		org_no: subcontractor.org_no || '',
		vat_no: toUndefined(subcontractor.vat_no),
		f_tax: subcontractor.f_tax ?? false,
		contact_person_name: toUndefined(subcontractor.contact_person_name),
		contact_person_phone: toUndefined(subcontractor.contact_person_phone),
		email: toUndefined(subcontractor.email),
		phone_mobile: toUndefined(subcontractor.phone_mobile),
		phone_work: toUndefined(subcontractor.phone_work),
		invoice_email: toUndefined(subcontractor.invoice_email),
		invoice_method: subcontractor.invoice_method,
		peppol_id: toUndefined(subcontractor.peppol_id),
		gln: toUndefined(subcontractor.gln),
		terms: subcontractor.terms ?? undefined,
		default_vat_rate: subcontractor.default_vat_rate ?? 25,
		hourly_rate_sek: subcontractor.hourly_rate_sek ?? undefined,
		bankgiro: toUndefined(subcontractor.bankgiro),
		plusgiro: toUndefined(subcontractor.plusgiro),
		reference: toUndefined(subcontractor.reference),
		invoice_address_street: toUndefined(subcontractor.invoice_address_street),
		invoice_address_zip: toUndefined(subcontractor.invoice_address_zip),
		invoice_address_city: toUndefined(subcontractor.invoice_address_city),
		invoice_address_country: toUndefined(subcontractor.invoice_address_country),
		delivery_address_street: toUndefined(subcontractor.delivery_address_street),
		delivery_address_zip: toUndefined(subcontractor.delivery_address_zip),
		delivery_address_city: toUndefined(subcontractor.delivery_address_city),
		delivery_address_country: toUndefined(subcontractor.delivery_address_country),
		notes: toUndefined(subcontractor.notes),
		user_id: subcontractor.user_id, // Required field
		is_archived: subcontractor.is_archived ?? false,
	};
};

/**
 * Build subcontractor insert payload with org and user IDs
 */
export const buildSubcontractorInsert = ({
	payload,
	orgId,
	userId,
}: {
	payload: SubcontractorPayload;
	orgId: string;
	userId: string;
}) => {
	const base = prepareSubcontractorFields(payload);
	const subcontractorNo = payload.subcontractor_no ?? generateSubcontractorNumber();

	return {
		org_id: orgId,
		subcontractor_no: subcontractorNo,
		...base,
		created_by: userId,
		updated_by: userId,
	};
};

/**
 * Build subcontractor update payload with user ID
 */
export const buildSubcontractorUpdate = ({
	payload,
	userId,
}: {
	payload: SubcontractorPayload;
	userId: string;
}) => {
	const base = prepareSubcontractorFields(payload);

	return {
		...base,
		...(payload.subcontractor_no !== undefined
			? { subcontractor_no: payload.subcontractor_no ?? null }
			: {}),
		updated_by: userId,
	};
};

