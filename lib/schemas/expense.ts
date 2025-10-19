import { z } from 'zod';

// Expense validation schema
export const expenseSchema = z.object({
	project_id: z.string().uuid({ message: 'Giltigt projekt måste väljas' }),
	category: z.string().optional().nullable(),
	description: z.string().min(1, { message: 'Beskrivning är obligatorisk' }),
	amount_sek: z.number().positive({ message: 'Belopp måste vara större än 0' }),
	vat: z.boolean(),
	photo_urls: z.array(z.string().url()).max(10, { message: 'Maximalt 10 foton tillåtna' }).default([]),
	notes: z.string().optional().nullable(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
});

// Schema for creating a new expense
export const createExpenseSchema = expenseSchema.omit({ status: true });

// Schema for updating an existing expense
export const updateExpenseSchema = expenseSchema.partial();

// TypeScript types
export type Expense = z.infer<typeof expenseSchema> & {
	id: string;
	org_id: string;
	user_id: string;
	approved_by: string | null;
	approved_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// Extended type with relations for display
export type ExpenseWithRelations = Expense & {
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

// Common expense categories for Swedish construction
export const EXPENSE_CATEGORIES = [
	{ value: 'verktyg', label: 'Verktyg' },
	{ value: 'material', label: 'Material' },
	{ value: 'hyrbil', label: 'Hyrbil' },
	{ value: 'drivmedel', label: 'Drivmedel' },
	{ value: 'parkering', label: 'Parkering' },
	{ value: 'broavgift', label: 'Broavgift' },
	{ value: 'måltid', label: 'Måltid' },
	{ value: 'logi', label: 'Logi' },
	{ value: 'transport', label: 'Transport' },
	{ value: 'övrigt', label: 'Övrigt' },
] as const;

