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

// Alert settings schema
export const alertSettingsSchema = z.object({
	work_day_start: z.string().default('07:00'),
	work_day_end: z.string().default('16:00'),
	notify_on_checkin: z.boolean().default(true),
	notify_on_checkout: z.boolean().default(true),
	checkin_reminder_enabled: z.boolean().default(true),
	checkin_reminder_minutes_before: z.number().int().min(1).max(120).default(15),
	checkin_reminder_for_workers: z.boolean().default(true),
	checkin_reminder_for_foreman: z.boolean().default(true),
	checkin_reminder_for_admin: z.boolean().default(true),
	checkout_reminder_enabled: z.boolean().default(true),
	checkout_reminder_minutes_before: z.number().int().min(1).max(120).default(15),
	checkout_reminder_for_workers: z.boolean().default(true),
	checkout_reminder_for_foreman: z.boolean().default(true),
	checkout_reminder_for_admin: z.boolean().default(true),
	late_checkin_enabled: z.boolean().default(false),
	late_checkin_minutes_after: z.number().int().min(1).max(120).default(15),
	forgotten_checkout_enabled: z.boolean().default(false),
	forgotten_checkout_minutes_after: z.number().int().min(1).max(120).default(30),
	alert_recipients: z.array(z.string()).default(['admin', 'foreman']),
});

export type AlertSettings = z.infer<typeof alertSettingsSchema>;

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
	// Personalliggare/Worksite fields
	worksite_enabled: z.boolean().default(false).optional(),
	worksite_code: z.string().max(100).optional().nullable(),
	address_line1: z.string().max(200).optional().nullable(),
	address_line2: z.string().max(200).optional().nullable(),
	postal_code: z.string().max(20).optional().nullable(),
	city: z.string().max(100).optional().nullable(),
	country: z.string().max(100).optional().nullable(),
	building_id: z.string().max(100).optional().nullable(),
	timezone: z.string().max(100).optional().nullable(),
	retention_years: z.number().int().min(2).optional().nullable(),
	alert_settings: alertSettingsSchema.optional(),
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
	// Worksite fields
	worksite_enabled?: boolean;
	worksite_code?: string | null;
	address_line1?: string | null;
	address_line2?: string | null;
	postal_code?: string | null;
	city?: string | null;
	country?: string | null;
	building_id?: string | null;
	timezone?: string | null;
	retention_years?: number | null;
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
	budget_hours: z.number().positive('Timmar måste vara större än 0').optional().nullable(),
	budget_amount: z.number().positive('Budget måste vara större än 0').optional().nullable(),
});

export type Phase = {
	id: string;
	project_id: string;
	name: string;
	sort_order: number;
	budget_hours: number | null;
	budget_amount: number | null;
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

