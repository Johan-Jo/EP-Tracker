import { z } from 'zod';

export const billingTypeEnum = z.enum(['LOPANDE', 'FAST']);
export type BillingType = z.infer<typeof billingTypeEnum>;

export const projectBillingModeEnum = z.enum(['LOPANDE_ONLY', 'FAST_ONLY', 'BOTH']);
export type ProjectBillingMode = z.infer<typeof projectBillingModeEnum>;

export const billingTypeOptions: { value: BillingType; label: string }[] = [
	{ value: 'LOPANDE', label: 'Löpande' },
	{ value: 'FAST', label: 'Fast' },
];

export const projectBillingModeOptions: { value: ProjectBillingMode; label: string }[] = [
	{ value: 'LOPANDE_ONLY', label: 'Endast Löpande' },
	{ value: 'FAST_ONLY', label: 'Endast Fast' },
	{ value: 'BOTH', label: 'Både Löpande och Fast' },
];


