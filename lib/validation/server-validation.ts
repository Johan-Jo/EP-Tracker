/**
 * Server-side validation utilities
 * 
 * Ensures Swedish error messages are used consistently across all API routes.
 */

import { z } from 'zod';
// import { swedishErrorMap } from './swedish-error-map'; // Temporarily disabled

/**
 * Initialize Zod with Swedish error map for server-side use
 * Call this once at the start of each API route handler that uses Zod
 */
export function initServerValidation() {
	// Temporarily disabled due to Zod type changes
	// z.setErrorMap(swedishErrorMap);
}

/**
 * Parse and validate data with Swedish error messages
 * 
 * @example
 * ```ts
 * const result = validateWithSwedish(schema, data);
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Valideringsfel', errors: result.errors },
 *     { status: 400 }
 *   );
 * }
 * 
 * // Use validated data
 * const validData = result.data;
 * ```
 */
export function validateWithSwedish<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
	// Temporarily disabled due to Zod type changes
	// const originalErrorMap = z.getErrorMap();
	// z.setErrorMap(swedishErrorMap);

	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	return {
		success: false,
		errors: result.error.issues,
	};
}

/**
 * Format Zod errors to a user-friendly Swedish format
 */
export function formatZodErrors(errors: z.ZodIssue[]): string[] {
	return errors.map((error) => {
		const path = error.path.length > 0 ? `${error.path.join('.')}: ` : '';
		return `${path}${error.message}`;
	});
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(errors: z.ZodIssue[]) {
	return {
		error: 'Valideringsfel',
		errors: formatZodErrors(errors),
		details: errors, // Include raw errors for debugging
	};
}

