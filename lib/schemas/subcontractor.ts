import { z } from 'zod';
import { normalizeSwedishOrganizationNumber, isValidSwedishOrganizationNumber } from '@/lib/utils/swedish';

const requiredUuid = z.string().uuid({ message: 'Ogiltigt UUID-format' });

const optionalTrimmedString = (max: number) =>
	z
		.union([z.string(), z.null(), z.undefined(), z.literal('')])
		.transform((value) => {
			if (value === null || value === undefined || value === '') {
				return undefined;
			}
			if (typeof value === 'string') {
				const trimmed = value.trim();
				return trimmed.length === 0 ? undefined : trimmed;
			}
			return undefined;
		})
		.optional()
		.refine(
			(value) => value === undefined || (typeof value === 'string' && value.length <= max),
			{ message: `Fältet får inte vara längre än ${max} tecken` }
		);

const optionalEmailString = z
	.union([z.string(), z.null(), z.undefined(), z.literal('')])
	.transform((value) => {
		if (value === null || value === undefined || value === '') {
			return undefined;
		}
		if (typeof value !== 'string') {
			return undefined;
		}
		const trimmed = value.trim();
		return trimmed.length === 0 ? undefined : trimmed.toLowerCase();
	})
	.optional()
	.refine(
		(value) => value === undefined || z.string().email().safeParse(value).success,
		{ message: 'Ogiltig e-postadress' }
	);

const optionalInteger = z
	.preprocess((value) => {
		if (value === null || value === undefined || value === '') {
			return undefined;
		}

		if (typeof value === 'string') {
			return Number.parseInt(value, 10);
		}

		return value;
	}, z.number().int())
	.optional();

const optionalDecimal = z
	.preprocess((value) => {
		if (value === null || value === undefined || value === '') {
			return undefined;
		}

		if (typeof value === 'string') {
			return Number.parseFloat(value);
		}

		return value;
	}, z.number())
	.optional();

export const invoiceMethodEnum = z.enum(['EMAIL', 'EFAKTURA', 'PAPER']);
export const vatRateEnum = z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(25)]);

export const subcontractorPayloadSchema = z
	.object({
		subcontractor_no: optionalTrimmedString(50),
		company_name: optionalTrimmedString(200),
		org_no: optionalTrimmedString(20),
		vat_no: optionalTrimmedString(20),
		f_tax: z.boolean().optional().default(false),
		contact_person_name: optionalTrimmedString(100),
		contact_person_phone: optionalTrimmedString(30),
		email: optionalEmailString,
		phone_mobile: optionalTrimmedString(30),
		phone_work: optionalTrimmedString(30),
		invoice_email: optionalEmailString,
		invoice_method: invoiceMethodEnum.default('EMAIL'),
		peppol_id: optionalTrimmedString(100),
		gln: optionalTrimmedString(20),
		terms: optionalInteger,
		default_vat_rate: vatRateEnum.optional().default(25),
		hourly_rate_sek: optionalDecimal,
		bankgiro: optionalTrimmedString(20),
		plusgiro: optionalTrimmedString(20),
		reference: optionalTrimmedString(100),
		invoice_address_street: optionalTrimmedString(200),
		invoice_address_zip: optionalTrimmedString(20),
		invoice_address_city: optionalTrimmedString(100),
		invoice_address_country: optionalTrimmedString(100),
		delivery_address_street: optionalTrimmedString(200),
		delivery_address_zip: optionalTrimmedString(20),
		delivery_address_city: optionalTrimmedString(100),
		delivery_address_country: optionalTrimmedString(100),
		notes: optionalTrimmedString(2000),
		user_id: requiredUuid,
		is_archived: z.boolean().optional().default(false),
	})
	.superRefine((data, ctx) => {
		// Company name is required
		if (!data.company_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['company_name'],
				message: 'Företagsnamn krävs',
			});
		}

		// Organization number is required
		if (!data.org_no) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['org_no'],
				message: 'Organisationsnummer krävs',
			});
		} else {
			// Validate and normalize organization number
			try {
				const normalized = normalizeSwedishOrganizationNumber(data.org_no);
				if (!isValidSwedishOrganizationNumber(normalized)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['org_no'],
						message: 'Ogiltigt organisationsnummer',
					});
				}
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['org_no'],
					message: 'Ogiltigt organisationsnummer',
				});
			}
		}

		// Invoice email is only required if invoice method is EMAIL
		if (data.invoice_method === 'EMAIL' && !data.invoice_email) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['invoice_email'],
				message: 'Fakturamejl krävs när fakturakanal är E-postfaktura',
			});
		}
	});

export type SubcontractorPayload = z.infer<typeof subcontractorPayloadSchema>;

export type Subcontractor = {
	id: string;
	org_id: string;
	subcontractor_no: string;
	company_name: string;
	org_no: string;
	vat_no: string | null;
	f_tax: boolean;
	contact_person_name: string | null;
	contact_person_phone: string | null;
	email: string | null;
	phone_mobile: string | null;
	phone_work: string | null;
	invoice_email: string | null;
	invoice_method: z.infer<typeof invoiceMethodEnum>;
	peppol_id: string | null;
	gln: string | null;
	terms: number | null;
	default_vat_rate: number;
	hourly_rate_sek: number | null;
	bankgiro: string | null;
	plusgiro: string | null;
	reference: string | null;
	invoice_address_street: string | null;
	invoice_address_zip: string | null;
	invoice_address_city: string | null;
	invoice_address_country: string | null;
	delivery_address_street: string | null;
	delivery_address_zip: string | null;
	delivery_address_city: string | null;
	delivery_address_country: string | null;
	notes: string | null;
	user_id: string;
	is_archived: boolean;
	created_by: string | null;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
};

