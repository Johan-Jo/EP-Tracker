/**
 * Minimal route context type aligning with Next.js 15 route handler signature.
 */
export type RouteContext<T extends Record<string, unknown>> = {
	params: Promise<T>;
};

/**
 * Helper to safely resolve Next.js route params.
 *
 * In Next.js 15, the context.params value supplied to App Route handlers
 * is a Promise that resolves to the params object. Some routes might also
 * omit params entirely (e.g. static routes).
 *
 * This utility normalises that behaviour so handlers can `await` the params
 * only when they exist.
 */
export async function resolveRouteParams<T extends Record<string, unknown>>(
	context: RouteContext<T>,
): Promise<T> {
	return context.params;
}


