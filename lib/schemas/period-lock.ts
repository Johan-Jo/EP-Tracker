import { z } from 'zod';

// Period lock schema
export const periodLockSchema = z.object({
	id: z.string().uuid(),
	org_id: z.string().uuid(),
	period_start: z.string().or(z.date()),
	period_end: z.string().or(z.date()),
	locked_by: z.string().uuid(),
	locked_at: z.string().or(z.date()),
	reason: z.string().nullable().optional(),
	created_at: z.string().or(z.date()),
	updated_at: z.string().or(z.date()),
});

// Create period lock schema
export const createPeriodLockSchema = z.object({
	period_start: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: 'Ogiltigt startdatum',
	}),
	period_end: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: 'Ogiltigt slutdatum',
	}),
	reason: z.string().optional(),
}).refine((data) => {
	const start = new Date(data.period_start);
	const end = new Date(data.period_end);
	return end >= start;
}, {
	message: 'Slutdatum måste vara efter eller samma som startdatum',
	path: ['period_end'],
});

// TypeScript types
export type PeriodLock = z.infer<typeof periodLockSchema>;
export type CreatePeriodLockInput = z.infer<typeof createPeriodLockSchema>;

export interface PeriodLockWithUser extends PeriodLock {
	locked_by_user?: {
		full_name: string;
		email: string;
	};
}

