import { z } from 'zod';

// Mileage validation schema
// Note: Database uses rate_per_km_sek, but we convert from Swedish "mil" rate in the UI
export const mileageSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Datum måste vara i format YYYY-MM-DD' }),
	km: z.number().positive({ message: 'Kilometer måste vara större än 0' }),
	rate_per_km_sek: z.number().positive({ message: 'Ersättning per km måste vara större än 0' }),
	from_location: z.string().optional().nullable(),
	to_location: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
});

// Schema for creating new mileage
export const createMileageSchema = mileageSchema.omit({ status: true });

// Schema for updating existing mileage
export const updateMileageSchema = mileageSchema.partial();

// Travel time validation schema
export const travelTimeSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Datum måste vara i format YYYY-MM-DD' }),
	duration_min: z.number().positive({ message: 'Tid måste vara större än 0' }),
	from_location: z.string().optional().nullable(),
	to_location: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
});

// Schema for creating new travel time
export const createTravelTimeSchema = travelTimeSchema.omit({ status: true });

// Schema for updating existing travel time
export const updateTravelTimeSchema = travelTimeSchema.partial();

// TypeScript types
export type Mileage = z.infer<typeof mileageSchema> & {
	id: string;
	org_id: string;
	user_id: string;
	total_sek: number; // Calculated: km * rate_per_km_sek
	approved_by: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateMileageInput = z.infer<typeof createMileageSchema>;
export type UpdateMileageInput = z.infer<typeof updateMileageSchema>;

export type TravelTime = z.infer<typeof travelTimeSchema> & {
	id: string;
	org_id: string;
	user_id: string;
	approved_by: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateTravelTimeInput = z.infer<typeof createTravelTimeSchema>;
export type UpdateTravelTimeInput = z.infer<typeof updateTravelTimeSchema>;

// Extended types with relations for display
export type MileageWithRelations = Mileage & {
	project: {
		id: string;
		name: string;
		project_number: string | null;
	};
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
};

export type TravelTimeWithRelations = TravelTime & {
	project: {
		id: string;
		name: string;
		project_number: string | null;
	};
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
};

// Swedish mileage rate standards (2025)
// Note: Swedish "mil" = 10 km, so 18.50 kr/mil = 1.85 kr/km
export const MILEAGE_RATES = {
	standard_per_mil: 18.50, // kr/mil (Skatteverket standard 2025)
	standard_per_km: 1.85,   // kr/km (converted)
	own_car_per_km: 1.85,
	company_car_per_km: 0.65, // Lower rate for company cars
} as const;

