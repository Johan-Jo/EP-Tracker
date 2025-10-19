import { z } from 'zod';

// Time entry validation schema
export const timeEntrySchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	phase_id: z.string().uuid().optional().nullable(),
	work_order_id: z.string().uuid().optional().nullable(),
	task_label: z.string().optional().nullable(),
	start_at: z.string().refine((val) => {
		// Accept both ISO datetime and datetime-local format (yyyy-MM-ddTHH:mm)
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Starttid måste vara ett giltigt datum' }),
	stop_at: z.string().refine((val) => {
		// Accept both ISO datetime and datetime-local format (yyyy-MM-ddTHH:mm)
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Sluttid måste vara ett giltigt datum' }).optional().nullable(),
	notes: z.string().optional().nullable(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
}).refine(
	(data) => {
		// If stop_at exists, it must be after start_at
		if (data.stop_at && data.start_at) {
			return new Date(data.stop_at) > new Date(data.start_at);
		}
		return true;
	},
	{
		message: 'Sluttid måste vara efter starttid',
		path: ['stop_at'],
	}
);

// Schema for creating a new time entry
export const createTimeEntrySchema = timeEntrySchema.omit({ status: true });

// Schema for updating an existing time entry
export const updateTimeEntrySchema = timeEntrySchema.partial();

// Schema for crew clock-in (multiple users)
export const crewClockInSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	phase_id: z.string().uuid().optional().nullable(),
	work_order_id: z.string().uuid().optional().nullable(),
	task_label: z.string().optional().nullable(),
	user_ids: z.array(z.string().uuid()).min(1, { message: 'Minst en användare måste väljas' }),
	start_at: z.string().refine((val) => {
		// Accept both ISO datetime and datetime-local format (yyyy-MM-ddTHH:mm)
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?([+-]\d{2}:\d{2}|Z)?$/;
		return isoRegex.test(val) && !isNaN(new Date(val).getTime());
	}, { message: 'Starttid måste vara ett giltigt datum' }),
});

// TypeScript types
export type TimeEntry = z.infer<typeof timeEntrySchema> & {
	id: string;
	org_id: string;
	user_id: string;
	duration_min: number | null;
	approved_by: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type CrewClockInInput = z.infer<typeof crewClockInSchema>;

// Extended type with relations for display
export type TimeEntryWithRelations = TimeEntry & {
	project: {
		id: string;
		name: string;
		project_number: string | null;
	};
	phase: {
		id: string;
		name: string;
	} | null;
	work_order: {
		id: string;
		name: string;
	} | null;
	user: {
		id: string;
		full_name: string | null;
		email: string;
	};
	approved_by_user: {
		id: string;
		full_name: string | null;
		email: string;
	} | null;
};

