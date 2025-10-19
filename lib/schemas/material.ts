import { z } from 'zod';

// Material validation schema
export const materialSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	phase_id: z.string().uuid().optional().nullable(),
	description: z.string().min(1, { message: 'Beskrivning är obligatorisk' }),
	qty: z.number().positive({ message: 'Antal måste vara större än 0' }),
	unit: z.string().min(1, { message: 'Enhet är obligatorisk' }),
	unit_price_sek: z.number().min(0, { message: 'Enhetspris kan inte vara negativt' }),
	photo_urls: z.array(z.string().url()).max(10, { message: 'Maximalt 10 foton tillåtna' }).default([]),
	notes: z.string().optional().nullable(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
});

// Schema for creating a new material
export const createMaterialSchema = materialSchema.omit({ status: true });

// Schema for updating an existing material
export const updateMaterialSchema = materialSchema.partial();

// TypeScript types
export type Material = z.infer<typeof materialSchema> & {
	id: string;
	org_id: string;
	user_id: string;
	total_sek: number;
	approved_by: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

// Extended type with relations for display
export type MaterialWithRelations = Material & {
	project: {
		id: string;
		name: string;
		project_number: string | null;
	};
	phase: {
		id: string;
		name: string;
	} | null;
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
};

// Common unit options for Swedish construction
export const MATERIAL_UNITS = [
	{ value: 'st', label: 'st (styck)' },
	{ value: 'm', label: 'm (meter)' },
	{ value: 'm2', label: 'm² (kvadratmeter)' },
	{ value: 'm3', label: 'm³ (kubikmeter)' },
	{ value: 'kg', label: 'kg (kilogram)' },
	{ value: 'l', label: 'l (liter)' },
	{ value: 'förp', label: 'förp (förpackning)' },
	{ value: 'rulle', label: 'rulle' },
	{ value: 'plåt', label: 'plåt' },
	{ value: 'paket', label: 'paket' },
] as const;

