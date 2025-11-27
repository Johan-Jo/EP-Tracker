import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const workOrderStatusSchema = z.enum([
	'PLANERAD',
	'PÅGÅENDE',
	'KLAR',
	'FAKTURERAD',
	'AVBOKAD',
]);

export const workOrderPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'AKUT']);

export const workOrderTypeSchema = z.enum(['PROJEKTBUNDEN', 'FRISTÅENDE']);

export const workOrderAssignmentStatusSchema = z.enum([
	'TILLDELAD',
	'KLARMARKERAD',
]);

// ============================================================================
// WORK ORDER ASSIGNMENT SCHEMA
// ============================================================================

export const workOrderAssignmentSchema = z.object({
	id: z.string().uuid(),
	work_order_id: z.string().uuid(),
	user_id: z.string().uuid(),
	role: z.string().nullable(),
	is_responsible: z.boolean(),
	assignment_status: workOrderAssignmentStatusSchema,
	created_at: z.string(),
	updated_at: z.string(),
});

export const createWorkOrderAssignmentSchema = z.object({
	work_order_id: z.string().uuid(),
	user_id: z.string().uuid(),
	role: z.string().nullable().optional(),
	is_responsible: z.boolean().optional().default(false),
	assignment_status: workOrderAssignmentStatusSchema.optional().default('TILLDELAD'),
});

// ============================================================================
// WORK ORDER SCHEMA
// ============================================================================

export const workOrderSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	project_id: z.string().uuid(),
	customer_id: z.string().uuid().nullable(),
	work_order_number: z.string(),
	title: z.string().min(1, 'Titel krävs'),
	description: z.string().nullable(),
	status: workOrderStatusSchema,
	priority: workOrderPrioritySchema,
	planned_start_at: z.string().nullable(),
	planned_end_at: z.string().nullable(),
	actual_start_at: z.string().nullable(),
	actual_end_at: z.string().nullable(),
	all_day: z.boolean(),
	work_order_type: workOrderTypeSchema,
	location_address: z.string().nullable(),
	location_city: z.string().nullable(),
	location_zip: z.string().nullable(),
	location_lat: z.number().nullable(),
	location_lng: z.number().nullable(),
	door_code: z.string().nullable(),
	location_notes: z.string().nullable(),
	internal_notes: z.string().nullable(),
	external_summary: z.string().nullable(),
	created_by_id: z.string().uuid().nullable(),
	closed_by_id: z.string().uuid().nullable(),
	closed_at: z.string().nullable(),
	signature_blob_url: z.string().nullable(),
	billing_type_override: z.string().nullable(),
	send_time_approval_email: z.boolean(),
	// Two-step approval: worker confirmation (step 1)
	actual_time_approval_token: z.string().nullable(), // Token for worker confirmation link
	actual_time_approval_sent_at: z.string().nullable(), // When worker confirmation email was sent
	actual_time_worker_confirmed_by_id: z.string().uuid().nullable(),
	actual_time_worker_confirmed_at: z.string().nullable(),
	// Two-step approval: manager approval (step 2)
	actual_time_manager_approval_token: z.string().nullable(),
	actual_time_manager_approval_sent_at: z.string().nullable(),
	actual_time_manager_approved_by_id: z.string().uuid().nullable(),
	actual_time_manager_approved_at: z.string().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
}).refine(
	(data) => {
		// Validate planned time range
		if (data.planned_start_at && data.planned_end_at) {
			return new Date(data.planned_end_at) > new Date(data.planned_start_at);
		}
		return true;
	},
	{
		message: 'Planerat slutdatum måste vara efter planerat startdatum',
		path: ['planned_end_at'],
	}
).refine(
	(data) => {
		// Validate actual time range
		if (data.actual_start_at && data.actual_end_at) {
			return new Date(data.actual_end_at) > new Date(data.actual_start_at);
		}
		return true;
	},
	{
		message: 'Faktiskt slutdatum måste vara efter faktiskt startdatum',
		path: ['actual_end_at'],
	}
);

// Schema for creating a new work order (omits generated fields)
// M1: work_order_type is always PROJEKTBUNDEN
export const createWorkOrderSchema = workOrderSchema.omit({
	id: true,
	work_order_number: true,
	created_at: true,
	updated_at: true,
}).extend({
	assignments: z.array(createWorkOrderAssignmentSchema.omit({ work_order_id: true })).optional(),
}).partial({
	// Make fields that are not provided by the form optional
	// These fields are set by the server or are optional
	organization_id: true,
	customer_id: true, // Can be set from project
	project_id: true, // Will be validated in onSubmit
	planned_start_at: true,
	planned_end_at: true,
	actual_start_at: true,
	actual_end_at: true,
	location_address: true,
	location_city: true,
	location_zip: true,
	location_lat: true,
	location_lng: true,
	door_code: true,
	location_notes: true,
	internal_notes: true,
	external_summary: true,
	created_by_id: true,
	closed_by_id: true,
	closed_at: true,
	signature_blob_url: true,
	billing_type_override: true,
	send_time_approval_email: true,
	actual_time_approval_token: true,
	actual_time_approval_sent_at: true,
	actual_time_worker_confirmed_by_id: true,
	actual_time_worker_confirmed_at: true,
	actual_time_manager_approval_token: true,
	actual_time_manager_approval_sent_at: true,
	actual_time_manager_approved_by_id: true,
	actual_time_manager_approved_at: true,
}).refine(
	(data) => data.work_order_type === 'PROJEKTBUNDEN',
	{
		message: 'I M1-versionen måste alla arbetsorder vara PROJEKTBUNDEN',
		path: ['work_order_type'],
	}
);

// Schema for updating a work order (all fields optional except id)
export const updateWorkOrderSchema = workOrderSchema
	.omit({
		id: true,
		organization_id: true,
		work_order_number: true,
		created_at: true,
		updated_at: true,
	})
	.partial()
	.extend({
		assignments: z.array(createWorkOrderAssignmentSchema.omit({ work_order_id: true })).optional(),
	});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;
export type WorkOrderPriority = z.infer<typeof workOrderPrioritySchema>;
export type WorkOrderType = z.infer<typeof workOrderTypeSchema>;
export type WorkOrderAssignmentStatus = z.infer<typeof workOrderAssignmentStatusSchema>;

export type WorkOrder = z.infer<typeof workOrderSchema>;
export type WorkOrderAssignment = z.infer<typeof workOrderAssignmentSchema>;
export type CreateWorkOrder = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrder = z.infer<typeof updateWorkOrderSchema>;
export type CreateWorkOrderAssignment = z.infer<typeof createWorkOrderAssignmentSchema>;

// Work order with relations (from API)
export type WorkOrderWithRelations = WorkOrder & {
	project?: {
		id: string;
		name: string;
		project_number?: string;
	};
	customer?: {
		id: string;
		type: 'COMPANY' | 'PRIVATE';
		company_name?: string;
		first_name?: string;
		last_name?: string;
	} | null;
	assignments?: Array<WorkOrderAssignment & {
		user?: {
			id: string;
			full_name?: string;
			email?: string;
		};
	}>;
	created_by?: {
		id: string;
		full_name?: string;
		email?: string;
	} | null;
	closed_by?: {
		id: string;
		full_name?: string;
		email?: string;
	} | null;
};

