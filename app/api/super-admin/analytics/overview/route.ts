/**
 * Analytics Overview API
 * 
 * GET /api/super-admin/analytics/overview - Get high-level analytics summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getCurrentEngagement } from '@/lib/super-admin/analytics-engagement';
import { getRetentionRate } from '@/lib/super-admin/analytics-cohorts';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const supabase = createAdminClient();

		// Get basic counts - use admin client to bypass RLS
		// Count active memberships instead of all profiles
		const [membershipsResult, orgsResult, activeOrgsResult, projectsResult, activeProjectsResult, engagement, retention] = await Promise.all([
			supabase.from('memberships').select('user_id', { count: 'exact', head: true }).eq('is_active', true),
			supabase.from('organizations').select('id', { count: 'exact', head: true }),
			supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
			supabase.from('projects').select('id', { count: 'exact', head: true }),
			supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
			getCurrentEngagement(),
			getRetentionRate(),
		]);

		// Get unique user count from memberships
		const { data: uniqueUsers } = await supabase
			.from('memberships')
			.select('user_id')
			.eq('is_active', true);
		
		const totalUsers = new Set((uniqueUsers || []).map((m: { user_id: string }) => m.user_id)).size;

		const overview = {
			total_users: totalUsers,
			total_organizations: orgsResult.count || 0,
			active_organizations: activeOrgsResult.count || 0,
			total_projects: projectsResult.count || 0,
			active_projects: activeProjectsResult.count || 0,
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

