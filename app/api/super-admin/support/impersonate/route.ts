/**
 * Start Impersonation API
 * 
 * POST /api/super-admin/support/impersonate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithDetails } from '@/lib/auth/super-admin';
import { startImpersonation } from '@/lib/super-admin/impersonation';
import { rateLimit, RateLimitPresets, getRateLimitHeaders } from '@/lib/rate-limit';
import { validateWithSwedish, validationErrorResponse } from '@/lib/validation/server-validation';
import { z } from 'zod';

const impersonateSchema = z.object({
	user_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdminWithDetails();

		// Rate limit: 5 impersonations per 5 minutes
		const rateLimitResult = rateLimit({
			...RateLimitPresets.IMPERSONATION,
			identifier: `impersonate:${superAdmin.user_id}`,
		});

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ 
					error: 'För många impersonation-försök. Försök igen om några minuter.',
					retryAfter: rateLimitResult.retryAfter,
				},
				{ 
					status: 429,
					headers: getRateLimitHeaders(rateLimitResult),
				}
			);
		}

		const body = await request.json();
		
		// Validate with Swedish error messages
		const validation = validateWithSwedish(impersonateSchema, body);
		if (!validation.success) {
			return NextResponse.json(
				validationErrorResponse(validation.errors),
				{ status: 400 }
			);
		}

		const { user_id } = validation.data;

		const session = await startImpersonation(user_id, superAdmin.user_id);

		return NextResponse.json({
			success: true,
			session,
			redirect: '/dashboard',
		});
	} catch (error) {
		console.error('Error starting impersonation:', error);

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

