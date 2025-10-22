import { z } from 'zod';

// Project status enum
export const projectStatusEnum = z.enum([
	'active',
	'paused',
	'completed',
	'archived',
]);

// Budget mode enum
export const budgetModeEnum = z.enum(['none', 'hours', 'amount', 'ep_sync']);

// Project schema for creation/editing
export const projectSchema = z.object({
	name: z
		.string()
		.min(1, 'Projektnamn krävs')
		.max(200, 'Projektnamn är för långt'),
	project_number: z.string().max(50).optional().nullable(),
	client_name: z.string().max(200).optional().nullable(),
	site_address: z.string().max(500).optional().nullable(),
	site_lat: z.number().min(-90).max(90).optional().nullable(),
	site_lon: z.number().min(-180).max(180).optional().nullable(),
	geo_fence_radius_m: z.number().int().min(0).max(10000).default(100),
	budget_mode: budgetModeEnum.default('none'),
	budget_hours: z.number().positive('Budget måste vara större än 0').optional().nullable(),
	budget_amount: z.number().positive('Budget måste vara större än 0').optional().nullable(),
	status: projectStatusEnum.default('active'),
});

// Project database type (what comes from DB)
export type Project = {
	id: string;
	org_id: string;
	name: string;
	project_number: string | null;
	client_name: string | null;
	site_address: string | null;
	site_lat: number | null;
	site_lon: number | null;
	geo_fence_radius_m: number;
	budget_mode: string;
	status: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

// Project form input type
export type ProjectFormData = z.infer<typeof projectSchema>;

// Project with phases (for detail view)
export type ProjectWithPhases = Project & {
	phases?: Phase[];
	work_orders?: WorkOrder[];
};

// Phase schema
export const phaseSchema = z.object({
	name: z.string().min(1, 'Fasnamn krävs').max(200, 'Fasnamn är för långt'),
	sort_order: z.number().int().min(0).default(0),
});

export type Phase = {
	id: string;
	project_id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type PhaseFormData = z.infer<typeof phaseSchema>;

// Work order status enum
export const workOrderStatusEnum = z.enum([
	'pending',
	'in_progress',
	'completed',
	'cancelled',
]);

// Work order schema
export const workOrderSchema = z.object({
	name: z
		.string()
		.min(1, 'Arbetsordernamn krävs')
		.max(200, 'Arbetsordernamn är för långt'),
	description: z.string().max(1000).optional().nullable(),
	phase_id: z.string().uuid().optional().nullable(),
	status: workOrderStatusEnum.default('pending'),
});

export type WorkOrder = {
	id: string;
	project_id: string;
	phase_id: string | null;
	name: string;
	description: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

