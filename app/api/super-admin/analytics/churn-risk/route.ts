/**
 * Churn Risk Analytics API
 * 
 * GET /api/super-admin/analytics/churn-risk - Get organizations at risk of churning
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getChurnRiskOrganizations } from '@/lib/super-admin/analytics-cohorts';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const risks = await getChurnRiskOrganizations();

		return NextResponse.json({ risks });
	} catch (error) {
		console.error('Error fetching churn risk:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

