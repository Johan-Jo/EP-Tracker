/**
 * Server-side validation utilities
 * 
 * Ensures Swedish error messages are used consistently across all API routes.
 */

import { z } from 'zod';
import { swedishErrorMap } from './swedish-error-map';

/**
 * Initialize Zod with Swedish error map for server-side use
 * Call this once at the start of each API route handler that uses Zod
 */
export function initServerValidation() {
	z.setErrorMap(swedishErrorMap);
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
	// Temporarily set error map for this validation
	const originalErrorMap = z.getErrorMap();
	z.setErrorMap(swedishErrorMap);

	try {
		const result = schema.safeParse(data);

		if (result.success) {
			return { success: true, data: result.data };
		}

		return {
			success: false,
			errors: result.error.errors,
		};
	} finally {
		// Restore original error map
		z.setErrorMap(originalErrorMap);
	}
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

