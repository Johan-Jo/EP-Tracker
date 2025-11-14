import { z } from 'zod';
import { normalizeSwedishPersonalIdentityNumber } from '@/lib/utils/swedish';

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

export const employmentTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY']);

const optionalUuid = z
	.union([z.string().uuid(), z.null(), z.undefined(), z.literal('')])
	.transform((value) => {
		if (value === null || value === undefined || value === '') {
			return undefined;
		}
		return value;
	})
	.optional();

export const employeePayloadSchema = z
	.object({
		employee_no: optionalTrimmedString(50),
		first_name: optionalTrimmedString(100),
		last_name: optionalTrimmedString(100),
		personal_identity_no: optionalTrimmedString(20),
		email: optionalEmailString,
		phone_mobile: optionalTrimmedString(30),
		phone_work: optionalTrimmedString(30),
		employment_type: employmentTypeEnum.default('FULL_TIME'),
		hourly_rate_sek: optionalDecimal,
		employment_start_date: optionalDate,
		employment_end_date: optionalDate,
		address_street: optionalTrimmedString(200),
		address_zip: optionalTrimmedString(20),
		address_city: optionalTrimmedString(100),
		address_country: optionalTrimmedString(100),
		notes: optionalTrimmedString(2000),
		user_id: optionalUuid,
		is_archived: z.boolean().optional().default(false),
	})
	.superRefine((data, ctx) => {
		// First name is required
		if (!data.first_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['first_name'],
				message: 'Förnamn krävs',
			});
		}

		// Last name is required
		if (!data.last_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['last_name'],
				message: 'Efternamn krävs',
			});
		}

		// Validate personal identity number if provided
		if (data.personal_identity_no) {
			try {
				const normalized = normalizeSwedishPersonalIdentityNumber(data.personal_identity_no);
				if (!normalized) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['personal_identity_no'],
						message: 'Ogiltigt personnummer',
					});
				}
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['personal_identity_no'],
					message: 'Ogiltigt personnummer',
				});
			}
		}

		// Validate employment end date is after start date
		if (data.employment_start_date && data.employment_end_date) {
			if (data.employment_end_date < data.employment_start_date) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['employment_end_date'],
					message: 'Slutdatum måste vara efter startdatum',
				});
			}
		}
	});

export type EmployeePayload = z.infer<typeof employeePayloadSchema>;

export type Employee = {
	id: string;
	org_id: string;
	employee_no: string;
	first_name: string;
	last_name: string;
	personal_identity_no: string | null;
	email: string | null;
	phone_mobile: string | null;
	phone_work: string | null;
	employment_type: z.infer<typeof employmentTypeEnum>;
	hourly_rate_sek: number | null;
	employment_start_date: string | null;
	employment_end_date: string | null;
	address_street: string | null;
	address_zip: string | null;
	address_city: string | null;
	address_country: string | null;
	notes: string | null;
	user_id: string | null;
	is_archived: boolean;
	created_by: string | null;
	updated_by: string | null;
	created_at: string;
	updated_at: string;
};

