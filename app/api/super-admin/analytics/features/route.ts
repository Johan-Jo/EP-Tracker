/**
 * Feature Adoption Analytics API
 * 
 * GET /api/super-admin/analytics/features - Get feature adoption metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getFeatureAdoption } from '@/lib/super-admin/analytics-features';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const searchParams = request.nextUrl.searchParams;
		const start_date = searchParams.get('start_date') || undefined;
		const end_date = searchParams.get('end_date') || undefined;

		const features = await getFeatureAdoption(
			start_date && end_date ? { start_date, end_date } : undefined
		);

		return NextResponse.json({ features });
	} catch (error) {
		console.error('Error fetching feature adoption:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

