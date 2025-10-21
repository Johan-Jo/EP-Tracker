/**
 * Content Analytics API
 * 
 * GET /api/super-admin/analytics/content - Get content growth metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getContentMetrics } from '@/lib/super-admin/analytics-content';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const metrics = await getContentMetrics();

		return NextResponse.json({ metrics });
	} catch (error) {
		console.error('Error fetching content metrics:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

