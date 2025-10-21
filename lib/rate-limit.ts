/**
 * Rate Limiting System
 * 
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, consider upgrading to Redis-based rate limiting.
 */

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

// In-memory store (replace with Redis for production multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

export interface RateLimitConfig {
	/** Maximum number of requests allowed in the window */
	maxRequests: number;
	/** Time window in seconds */
	windowSeconds: number;
	/** Identifier for this rate limit (e.g., user ID, IP address) */
	identifier: string;
	/** Optional: custom error message */
	errorMessage?: string;
}

export interface RateLimitResult {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
	retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @example
 * ```ts
 * const result = rateLimit({
 *   maxRequests: 100,
 *   windowSeconds: 60,
 *   identifier: userId,
 * });
 * 
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     { 
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.reset.toString(),
 *         'Retry-After': result.retryAfter?.toString() || '60',
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function rateLimit(config: RateLimitConfig): RateLimitResult {
	const { maxRequests, windowSeconds, identifier } = config;
	const now = Date.now();
	const windowMs = windowSeconds * 1000;
	const key = identifier;

	// Get or create entry
	let entry = rateLimitStore.get(key);

	if (!entry || entry.resetAt < now) {
		// Create new entry or reset expired one
		entry = {
			count: 1,
			resetAt: now + windowMs,
		};
		rateLimitStore.set(key, entry);

		return {
			success: true,
			limit: maxRequests,
			remaining: maxRequests - 1,
			reset: entry.resetAt,
		};
	}

	// Increment count
	entry.count++;

	// Check if limit exceeded
	if (entry.count > maxRequests) {
		const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

		return {
			success: false,
			limit: maxRequests,
			remaining: 0,
			reset: entry.resetAt,
			retryAfter,
		};
	}

	return {
		success: true,
		limit: maxRequests,
		remaining: maxRequests - entry.count,
		reset: entry.resetAt,
	};
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RateLimitPresets = {
	/** Very strict: 10 requests per minute (for sensitive operations) */
	STRICT: {
		maxRequests: 10,
		windowSeconds: 60,
	},
	/** Normal: 100 requests per minute (for API endpoints) */
	NORMAL: {
		maxRequests: 100,
		windowSeconds: 60,
	},
	/** Relaxed: 1000 requests per minute (for read operations) */
	RELAXED: {
		maxRequests: 1000,
		windowSeconds: 60,
	},
	/** Search: 30 requests per minute (for search endpoints) */
	SEARCH: {
		maxRequests: 30,
		windowSeconds: 60,
	},
	/** Impersonation: 5 requests per 5 minutes (very sensitive) */
	IMPERSONATION: {
		maxRequests: 5,
		windowSeconds: 300,
	},
	/** Email: 20 requests per hour (to prevent spam) */
	EMAIL: {
		maxRequests: 20,
		windowSeconds: 3600,
	},
} as const;

/**
 * Helper to get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Limit': result.limit.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': result.reset.toString(),
		...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
	};
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimits() {
	rateLimitStore.clear();
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(identifier: string): RateLimitEntry | null {
	return rateLimitStore.get(identifier) || null;
}

