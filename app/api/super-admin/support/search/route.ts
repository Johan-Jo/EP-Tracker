/**
 * Global Search API
 * 
 * GET /api/super-admin/support/search - Search users and organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithDetails } from '@/lib/auth/super-admin';
import { globalSearch } from '@/lib/super-admin/search';
import { rateLimit, RateLimitPresets, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdminWithDetails();

		// Rate limit: 30 searches per minute
		const rateLimitResult = rateLimit({
			...RateLimitPresets.SEARCH,
			identifier: `search:${superAdmin.user_id}`,
		});

		if (!rateLimitResult.success) {
			return NextResponse.json(
				{ 
					error: 'För många sökningar. Försök igen om en minut.',
					retryAfter: rateLimitResult.retryAfter,
				},
				{ 
					status: 429,
					headers: getRateLimitHeaders(rateLimitResult),
				}
			);
		}

		const searchParams = request.nextUrl.searchParams;
		const query = searchParams.get('q') || '';

		const results = await globalSearch(query);

		return NextResponse.json({ results });
	} catch (error) {
		console.error('Error in search API:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

