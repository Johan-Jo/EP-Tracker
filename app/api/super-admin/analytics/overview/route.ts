/**
 * Analytics Overview API
 * 
 * GET /api/super-admin/analytics/overview - Get high-level analytics summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getCurrentEngagement } from '@/lib/super-admin/analytics-engagement';
import { getRetentionRate } from '@/lib/super-admin/analytics-cohorts';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const supabase = await createClient();

		// Get basic counts
		const [usersResult, orgsResult, projectsResult, engagement, retention] = await Promise.all([
			supabase.from('profiles').select('id', { count: 'exact', head: true }),
			supabase.from('organizations').select('id', { count: 'exact', head: true }),
			supabase.from('projects').select('id', { count: 'exact', head: true }),
			getCurrentEngagement(),
			getRetentionRate(),
		]);

		const overview = {
			total_users: usersResult.count || 0,
			total_organizations: orgsResult.count || 0,
			total_projects: projectsResult.count || 0,
			dau: engagement.dau,
			wau: engagement.wau,
			mau: engagement.mau,
			retention_rate: retention.retention_rate,
		};

		return NextResponse.json(overview);
	} catch (error) {
		console.error('Error fetching analytics overview:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

