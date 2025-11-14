import { z } from 'zod';

const optionalTrimmedString = (max: number) =>
	z
		.preprocess((value) => {
			if (value === null || value === undefined) {
				return undefined;
			}
			if (typeof value === 'string') {
				const trimmed = value.trim();
				return trimmed.length === 0 ? undefined : trimmed;
			}
			return value;
		}, z.string().max(max))
		.optional();

const optionalEmailString = z
	.preprocess((value) => {
		if (value === null || value === undefined) {
			return undefined;
		}
		if (typeof value !== 'string') {
			return value;
		}
		const trimmed = value.trim();
		return trimmed.length === 0 ? undefined : trimmed.toLowerCase();
	}, z.string().email('Ogiltig e-postadress'))
	.optional();

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

const optionalDate = z
	.preprocess((value) => {
		if (value === null || value === undefined || value === '') {
			return undefined;
		}

		if (value instanceof Date) {
			return value;
		}

		const parsed = new Date(String(value));
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}, z.date())
	.optional();

export const customerTypeEnum = z.enum(['COMPANY', 'PRIVATE']);
export const invoiceMethodEnum = z.enum(['EMAIL', 'EFAKTURA', 'PAPER']);
export const vatRateEnum = z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(25)]);

export const customerPayloadSchema = z
	.object({
		type: customerTypeEnum.default('COMPANY'),
		customer_no: optionalTrimmedString(50),

		company_name: optionalTrimmedString(200),
		org_no: optionalTrimmedString(20),
		vat_no: optionalTrimmedString(20),
		f_tax: z.boolean().optional().default(false),

		first_name: optionalTrimmedString(100),
		last_name: optionalTrimmedString(100),
		personal_identity_no: optionalTrimmedString(20),
		rot_enabled: z.boolean().optional().default(false),
		property_designation: optionalTrimmedString(200),
		housing_assoc_org_no: optionalTrimmedString(20),
		apartment_no: optionalTrimmedString(20),
		ownership_share: optionalDecimal,
		rot_consent_at: optionalDate,

		invoice_email: optionalEmailString,
		invoice_method: invoiceMethodEnum.default('EMAIL'),
		peppol_id: optionalTrimmedString(50),
		gln: optionalTrimmedString(50),
		terms: optionalInteger.refine(
			(value) => value === undefined || (value >= 0 && value <= 120),
			{ message: 'Betalvillkor måste vara mellan 0 och 120 dagar' }
		),
		default_vat_rate: z
			.preprocess((value) => {
				if (value === null || value === undefined || value === '') {
					return undefined;
				}

				if (typeof value === 'string') {
					return Number.parseInt(value, 10);
				}

				return value;
			}, vatRateEnum)
			.optional()
			.default(25),
		bankgiro: optionalTrimmedString(20),
		plusgiro: optionalTrimmedString(20),
		reference: optionalTrimmedString(200),

		invoice_address_street: optionalTrimmedString(200),
		invoice_address_zip: optionalTrimmedString(20),
		invoice_address_city: optionalTrimmedString(100),
		invoice_address_country: optionalTrimmedString(100),
		delivery_address_street: optionalTrimmedString(200),
		delivery_address_zip: optionalTrimmedString(20),
		delivery_address_city: optionalTrimmedString(100),
		delivery_address_country: optionalTrimmedString(100),

		phone_mobile: optionalTrimmedString(30),
		notes: optionalTrimmedString(2000),
		is_archived: z.boolean().optional().default(false),
	})
	.superRefine((data, ctx) => {
		if (data.type === 'COMPANY' && !data.company_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['company_name'],
				message: 'Företagsnamn krävs för företagskund',
			});
		}

		if (data.type === 'PRIVATE') {
			if (!data.first_name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['first_name'],
					message: 'Förnamn krävs för privatkund',
				});
			}

			if (!data.last_name) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['last_name'],
					message: 'Efternamn krävs för privatkund',
				});
			}

			if (!data.personal_identity_no) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['personal_identity_no'],
					message: 'Personnummer krävs för privatkund',
				});
			}
		}

		if (data.rot_enabled) {
			if (!data.personal_identity_no) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['personal_identity_no'],
					message: 'Personnummer krävs när ROT är aktiverat',
				});
			}

			const hasProperty = Boolean(data.property_designation);
			const hasHousingAssociation = Boolean(data.housing_assoc_org_no) && Boolean(data.apartment_no);

			if (!hasProperty && !hasHousingAssociation) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['property_designation'],
					message: 'Ange fastighetsbeteckning eller BRF + lägenhetsnummer',
				});
			}

			if (data.ownership_share === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['ownership_share'],
					message: 'Ange ägarandel i procent',
				});
			} else if (data.ownership_share < 0 || data.ownership_share > 100) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['ownership_share'],
					message: 'Ägarandel måste vara mellan 0 och 100 procent',
				});
			}

			if (!data.rot_consent_at) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['rot_consent_at'],
					message: 'Medgivandedatum krävs för ROT',
				});
			}
		}
	});

export const customerContactSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Namn krävs')
		.max(200, 'Namnet är för långt'),
	role: optionalTrimmedString(100),
	email: optionalEmailString,
	phone: optionalTrimmedString(30),
	reference_code: optionalTrimmedString(50),
	is_primary: z.boolean().optional().default(false),
});

export type CustomerPayload = z.infer<typeof customerPayloadSchema>;
export type CustomerContactPayload = z.infer<typeof customerContactSchema>;

export type Customer = {
	id: string;
	org_id: string;
	customer_no: string;
	type: z.infer<typeof customerTypeEnum>;
	company_name: string | null;
	org_no: string | null;
	vat_no: string | null;
	f_tax: boolean;
	first_name: string | null;
	last_name: string | null;
	personal_identity_no: string | null;
	rot_enabled: boolean;
	property_designation: string | null;
	housing_assoc_org_no: string | null;
	apartment_no: string | null;
	ownership_share: number | null;
	rot_consent_at: string | null;
	invoice_email: string | null;
	invoice_method: z.infer<typeof invoiceMethodEnum>;
	peppol_id: string | null;
	gln: string | null;
	terms: number | null;
	default_vat_rate: z.infer<typeof vatRateEnum>;
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
	phone_mobile: string | null;
	notes: string | null;
	is_archived: boolean;
	created_by: string | null;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
};

export type CustomerContact = {
	id: string;
	org_id: string;
	customer_id: string;
	name: string;
	role: string | null;
	email: string | null;
	phone: string | null;
	reference_code: string | null;
	is_primary: boolean;
	created_by: string | null;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
};


