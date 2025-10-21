/**
 * Performance Metrics API
 * 
 * GET /api/super-admin/analytics/performance - Get performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import {
	getApiPerformanceMetrics,
	getErrorRates,
	getDatabasePerformance,
	getPageLoadMetrics,
	getPerformanceSummary,
} from '@/lib/super-admin/analytics-performance';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const [apiMetrics, errorRates, dbPerformance, pageLoadMetrics, summary] = await Promise.all([
			getApiPerformanceMetrics(),
			getErrorRates(),
			getDatabasePerformance(),
			getPageLoadMetrics(),
			getPerformanceSummary(),
		]);

		return NextResponse.json({
			summary,
			api_metrics: apiMetrics,
			error_rates: errorRates,
			database: dbPerformance,
			page_load: pageLoadMetrics,
		});
	} catch (error) {
		console.error('Error fetching performance metrics:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

