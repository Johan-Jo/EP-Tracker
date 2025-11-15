import { z } from 'zod';
import { billingTypeEnum } from './billing-types';

const coerceOptionalNumber = (options?: { min?: number; minMessage?: string }) =>
	z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) {
				return undefined;
			}

			if (typeof val === 'number') {
				return val;
			}

			if (typeof val === 'string') {
				const normalized = val.replace(',', '.').trim();
				if (normalized === '') return undefined;
				const parsed = Number(normalized);
				return Number.isFinite(parsed) ? parsed : NaN;
			}

			return val;
		},
		z
			.number({ message: 'Värdet måste vara ett tal' })
			.refine(
				(value) => (options?.min !== undefined ? value >= options.min : true),
				{
					message:
						options?.min !== undefined
							? options?.minMessage ?? `Värdet måste vara minst ${options.min}`
							: 'Ogiltigt värde',
				},
			)
			.optional(),
	);

export const ataInputSchema = z
	.object({
		project_id: z.string().uuid({ message: 'Välj ett projekt' }),
		title: z.string().min(1, 'Titel krävs'),
		description: z.string().optional().nullable(),
		qty: coerceOptionalNumber({ min: 0 }),
		unit: z
			.string()
			.trim()
			.max(50, 'Enheten får vara max 50 tecken')
			.optional()
			.nullable(),
		unit_price_sek: coerceOptionalNumber({ min: 0 }),
		materials_amount_sek: coerceOptionalNumber({ min: 0 }),
		ata_number: z.string().trim().optional().nullable(),
		billing_type: billingTypeEnum.default('LOPANDE'),
		fixed_amount_sek: coerceOptionalNumber({ min: 0.01, minMessage: 'Fast belopp måste vara större än 0' }),
		material_ids: z.array(z.string().uuid()).optional(),
		expense_ids: z.array(z.string().uuid()).optional(),
		status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'invoiced']).default('draft'),
		signed_by_name: z.string().optional(),
		signed_at: z
			.union([z.string().datetime({ offset: true }), z.string().datetime({ offset: false })])
			.optional()
			.or(z.date())
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.billing_type === 'FAST') {
			if (data.fixed_amount_sek === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Fast belopp krävs för fast debitering',
					path: ['fixed_amount_sek'],
				});
			}
		}

		if (data.billing_type === 'LOPANDE') {
			if (data.qty !== undefined && data.qty < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Kvantitet kan inte vara negativ',
					path: ['qty'],
				});
			}
			if (data.unit_price_sek !== undefined && data.unit_price_sek < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'À-pris kan inte vara negativt',
					path: ['unit_price_sek'],
				});
			}
			if (data.unit_price_sek === undefined || data.unit_price_sek <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Projektets timtaxa saknas eller är ogiltig',
					path: ['unit_price_sek'],
				});
			}
		}
		if (data.materials_amount_sek !== undefined && data.materials_amount_sek < 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Materialkostnad kan inte vara negativ',
				path: ['materials_amount_sek'],
			});
		}
	});

export type AtaInput = z.infer<typeof ataInputSchema>;


