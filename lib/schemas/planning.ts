import { z } from 'zod';

// ============================================================================
// ASSIGNMENT SCHEMAS
// ============================================================================

// Assignment status enum
export const assignmentStatusEnum = z.enum(['planned', 'in_progress', 'done', 'cancelled']);

// Base assignment schema
export const assignmentSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	user_id: z.string().uuid({ message: 'Giltig användare måste väljas' }),
	start_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Starttid måste vara ett giltigt datum' }),
	end_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Sluttid måste vara ett giltigt datum' }),
	all_day: z.boolean().default(true),
	address: z.string().max(500).optional().nullable(),
	note: z.string().max(1000).optional().nullable(),
	sync_to_mobile: z.boolean().default(true),
	status: assignmentStatusEnum.default('planned'),
}).refine(
	(data) => {
		// end_ts must be after start_ts
		if (data.start_ts && data.end_ts) {
			return new Date(data.end_ts) > new Date(data.start_ts);
		}
		return true;
	},
	{
		message: 'Sluttid måste vara efter starttid',
		path: ['end_ts'],
	}
);

// Schema for creating assignments (supports multi-assign via user_ids array)
export const createAssignmentSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	user_ids: z.array(z.string().uuid()).min(1, { message: 'Minst en användare måste väljas' }),
	start_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Starttid måste vara ett giltigt datum' }),
	end_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Sluttid måste vara ett giltigt datum' }),
	all_day: z.boolean().default(true),
	address: z.string().max(500).optional().nullable(),
	note: z.string().max(1000).optional().nullable(),
	sync_to_mobile: z.boolean().default(true),
	force: z.boolean().optional(), // For overriding conflicts
	override_comment: z.string().optional(), // Required when force=true
}).refine(
	(data) => {
		return new Date(data.end_ts) > new Date(data.start_ts);
	},
	{
		message: 'Sluttid måste vara efter starttid',
		path: ['end_ts'],
	}
).refine(
	(data) => {
		// If force is true, override_comment is required
		if (data.force && !data.override_comment) {
			return false;
		}
		return true;
	},
	{
		message: 'Kommentar krävs vid åsidosättning av konflikt',
		path: ['override_comment'],
	}
);

// Schema for updating assignments
export const updateAssignmentSchema = z.object({
	project_id: z.string().uuid().optional(),
	user_id: z.string().uuid().optional(),
	start_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Starttid måste vara ett giltigt datum' }).optional(),
	end_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Sluttid måste vara ett giltigt datum' }).optional(),
	all_day: z.boolean().optional(),
	address: z.string().max(500).optional().nullable(),
	note: z.string().max(1000).optional().nullable(),
	sync_to_mobile: z.boolean().optional(),
	status: assignmentStatusEnum.optional(),
});

// ============================================================================
// ABSENCE SCHEMAS
// ============================================================================

export const absenceTypeEnum = z.enum(['vacation', 'sick', 'training']);

export const absenceSchema = z.object({
	user_id: z.string().uuid({ message: 'Giltig användare måste väljas' }),
	type: absenceTypeEnum,
	start_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Startdatum måste vara ett giltigt datum' }),
	end_ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Slutdatum måste vara ett giltigt datum' }),
	note: z.string().max(500).optional().nullable(),
}).refine(
	(data) => {
		return new Date(data.end_ts) > new Date(data.start_ts);
	},
	{
		message: 'Slutdatum måste vara efter startdatum',
		path: ['end_ts'],
	}
);

export const updateAbsenceSchema = absenceSchema.partial();

// ============================================================================
// SHIFT TEMPLATE SCHEMAS
// ============================================================================

export const shiftTemplateSchema = z.object({
	label: z.string().min(1, { message: 'Etikettnamn krävs' }).max(100),
	start_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Starttid måste vara i formatet HH:MM' }),
	end_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Sluttid måste vara i formatet HH:MM' }),
	days_of_week: z.array(z.number().int().min(1).max(7)).default([]),
	is_default: z.boolean().default(false),
});

// ============================================================================
// MOBILE NOTE SCHEMAS
// ============================================================================

export const mobileNoteSchema = z.object({
	assignment_id: z.string().uuid({ message: 'Giltigt uppdrag måste väljas' }),
	content: z.string().min(1, { message: 'Innehåll krävs' }).max(1000),
	pinned: z.boolean().default(true),
});

// ============================================================================
// MOBILE CHECK-IN SCHEMAS
// ============================================================================

export const mobileCheckinSchema = z.object({
	assignment_id: z.string().uuid({ message: 'Giltigt uppdrag måste väljas' }),
	event: z.enum(['check_in', 'check_out']),
	ts: z.string().refine((val) => {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Tidsstämpel måste vara ett giltigt datum' }),
});

// ============================================================================
// CONFLICT SCHEMA
// ============================================================================

export const conflictSchema = z.object({
	user_id: z.string().uuid(),
	type: z.enum(['absence', 'overlap']),
	details: z.string(),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

// Assignment types
export type Assignment = z.infer<typeof assignmentSchema> & {
	id: string;
	org_id: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

export type AssignmentWithRelations = Assignment & {
	project: {
		id: string;
		name: string;
		project_number: string | null;
		color: string;
		client_name: string | null;
	};
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
	mobile_notes?: MobileNote[];
};

// Absence types
export type Absence = z.infer<typeof absenceSchema> & {
	id: string;
	org_id: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type AbsenceWithUser = Absence & {
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
};

export type CreateAbsenceInput = z.infer<typeof absenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;

// Shift template types
export type ShiftTemplate = z.infer<typeof shiftTemplateSchema> & {
	id: string;
	org_id: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateShiftTemplateInput = z.infer<typeof shiftTemplateSchema>;

// Mobile note types
export type MobileNote = z.infer<typeof mobileNoteSchema> & {
	id: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateMobileNoteInput = z.infer<typeof mobileNoteSchema>;

// Mobile check-in types
export type MobileCheckinInput = z.infer<typeof mobileCheckinSchema>;

// Conflict types
export type Conflict = z.infer<typeof conflictSchema>;

// Week planning data structure
export type WeekPlanningData = {
	resources: Array<{
		id: string;
		full_name: string | null;
		email: string;
		role: string;
		is_active: boolean;
	}>;
	projects: Array<{
		id: string;
		name: string;
		project_number: string | null;
		client_name: string | null;
		color: string;
		daily_capacity_need: number;
		status: string;
	}>;
	assignments: AssignmentWithRelations[];
	absences: AbsenceWithUser[];
};

// Person status calculation
export type PersonStatus = 'available' | 'busy' | 'vacation';

