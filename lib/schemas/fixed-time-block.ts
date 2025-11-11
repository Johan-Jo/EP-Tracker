import { z } from 'zod';

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum måste anges i formatet ÅÅÅÅ-MM-DD');

export const fixedTimeBlockSchema = z
	.object({
		project_id: z.string().uuid({ message: 'Projekt måste väljas' }),
		name: z.string().min(1, 'Namn krävs').max(200, 'Namnet är för långt'),
		description: z.string().max(1000).optional().nullable(),
		amount_sek: z
			.number({ message: 'Belopp måste vara ett tal' })
			.positive('Belopp måste vara större än 0'),
		vat_pct: z
			.number({ message: 'Moms måste vara ett tal' })
			.min(0, 'Moms kan inte vara negativ')
			.max(100, 'Moms kan inte överstiga 100%')
			.default(25),
		article_no: z.string().max(50).optional().nullable(),
		account_no: z.string().max(50).optional().nullable(),
		period_start: dateStringSchema.optional().nullable(),
		period_end: dateStringSchema.optional().nullable(),
	})
	.refine(
		(data) => {
			if (data.period_start && data.period_end) {
				return data.period_end >= data.period_start;
			}
			return true;
		},
		{
			message: 'Slutdatum måste vara efter startdatum',
			path: ['period_end'],
		},
	);

export const fixedTimeBlockUpdateSchema = fixedTimeBlockSchema
	.partial()
	.extend({
		status: z.enum(['open', 'closed']).optional(),
	})
	.refine(
		(data) => {
			if (data.period_start && data.period_end) {
				return data.period_end >= data.period_start;
			}
			return true;
		},
		{
			message: 'Slutdatum måste vara efter startdatum',
			path: ['period_end'],
		},
	);

export type FixedTimeBlockInput = z.infer<typeof fixedTimeBlockSchema>;
export type UpdateFixedTimeBlockInput = z.infer<typeof fixedTimeBlockUpdateSchema>;

export type FixedTimeBlock = FixedTimeBlockInput & {
	id: string;
	org_id: string;
	status: 'open' | 'closed';
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

