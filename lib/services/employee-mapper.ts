import { type Employee, type EmployeePayload, employeePayloadSchema } from '@/lib/schemas/employee';
import { normalizeSwedishPersonalIdentityNumber } from '@/lib/utils/swedish';

/**
 * Generate a unique employee number
 * Format: E-YYYY-XXXX (e.g., E-2025-0001)
 */
export function generateEmployeeNumber(): string {
	const year = new Date().getFullYear();
	// In a real implementation, you'd query the database for the next number
	// For now, we'll use a timestamp-based approach
	const random = Math.floor(Math.random() * 10000);
	return `E-${year}-${random.toString().padStart(4, '0')}`;
}

/**
 * Generate employee number on client side (for form pre-fill)
 */
export function generateEmployeeNumberClient(): string {
	try {
		return `E-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()}`;
	} catch {
		return `E-${new Date().getFullYear()}-${Math.random().toString(36).toUpperCase().slice(2, 6)}`;
	}
}

/**
 * Parse and validate employee payload from request
 */
export const parseEmployeePayload = (data: unknown) => employeePayloadSchema.parse(data);

/**
 * Prepare employee fields for database insertion/update
 * Normalizes data and handles null/undefined values
 */
export const prepareEmployeeFields = (payload: EmployeePayload) => {
	const toNullable = (value: string | undefined): string | null => {
		return value === undefined || value === null || value === '' ? null : value;
	};

	// Normalize personal identity number if provided
	let normalizedPersonalId: string | null = null;
	if (payload.personal_identity_no) {
		try {
			const normalized = normalizeSwedishPersonalIdentityNumber(payload.personal_identity_no);
			normalizedPersonalId = normalized ? normalized : null;
		} catch {
			// If normalization fails, keep original (validation should catch this)
			normalizedPersonalId = payload.personal_identity_no || null;
		}
	}

	return {
		employee_no: payload.employee_no || null,
		first_name: payload.first_name || '',
		last_name: payload.last_name || '',
		personal_identity_no: normalizedPersonalId,
		email: toNullable(payload.email),
		phone_mobile: toNullable(payload.phone_mobile),
		phone_work: toNullable(payload.phone_work),
		employment_type: payload.employment_type || 'FULL_TIME',
		hourly_rate_sek: payload.hourly_rate_sek ?? null,
		employment_start_date: payload.employment_start_date
			? payload.employment_start_date.toISOString().split('T')[0]
			: null,
		employment_end_date: payload.employment_end_date
			? payload.employment_end_date.toISOString().split('T')[0]
			: null,
		address_street: toNullable(payload.address_street),
		address_zip: toNullable(payload.address_zip),
		address_city: toNullable(payload.address_city),
		address_country: toNullable(payload.address_country) || 'Sverige',
		notes: toNullable(payload.notes),
		user_id: payload.user_id ? payload.user_id : null,
		is_archived: payload.is_archived ?? false,
	};
};

/**
 * Convert Employee database record to EmployeePayload for form defaults
 */
export const employeeToPayload = (employee: Employee): EmployeePayload => {
	const toUndefined = (value: string | null | undefined): string | undefined => {
		return value === null || value === undefined || value === '' ? undefined : value;
	};

	return {
		employee_no: employee.employee_no,
		first_name: employee.first_name || '',
		last_name: employee.last_name || '',
		personal_identity_no: toUndefined(employee.personal_identity_no),
		email: toUndefined(employee.email),
		phone_mobile: toUndefined(employee.phone_mobile),
		phone_work: toUndefined(employee.phone_work),
		employment_type: employee.employment_type,
		hourly_rate_sek: employee.hourly_rate_sek ?? undefined,
		employment_start_date: employee.employment_start_date
			? new Date(employee.employment_start_date)
			: undefined,
		employment_end_date: employee.employment_end_date
			? new Date(employee.employment_end_date)
			: undefined,
		address_street: toUndefined(employee.address_street),
		address_zip: toUndefined(employee.address_zip),
		address_city: toUndefined(employee.address_city),
		address_country: toUndefined(employee.address_country),
		notes: toUndefined(employee.notes),
		user_id: employee.user_id ?? undefined,
		is_archived: employee.is_archived ?? false,
	};
};

/**
 * Build employee insert payload with org and user IDs
 */
export const buildEmployeeInsert = ({
	payload,
	orgId,
	userId,
}: {
	payload: EmployeePayload;
	orgId: string;
	userId: string;
}) => {
	const base = prepareEmployeeFields(payload);
	const employeeNo = payload.employee_no ?? generateEmployeeNumber();

	return {
		org_id: orgId,
		...base,
		employee_no: employeeNo, // Override base.employee_no which might be null
		created_by: userId,
		updated_by: userId,
	};
};

/**
 * Build employee update payload with user ID
 */
export const buildEmployeeUpdate = ({
	payload,
	userId,
}: {
	payload: EmployeePayload;
	userId: string;
}) => {
	const base = prepareEmployeeFields(payload);

	return {
		...base,
		...(payload.employee_no !== undefined ? { employee_no: payload.employee_no ?? null } : {}),
		updated_by: userId,
	};
};

