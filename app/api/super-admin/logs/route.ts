/**
 * Audit Logs API
 * 
 * GET /api/super-admin/logs - Get audit logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getAuditLogs, getAuditLogActions, getAuditLogResourceTypes } from '@/lib/super-admin/audit-logs';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const searchParams = request.nextUrl.searchParams;

		// Parse filters from query params
		const filters = {
			admin_id: searchParams.get('admin_id') || undefined,
			action: searchParams.get('action') || undefined,
			resource_type: searchParams.get('resource_type') || undefined,
			start_date: searchParams.get('start_date') || undefined,
			end_date: searchParams.get('end_date') || undefined,
			limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
			offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
		};

		const result = await getAuditLogs(filters);

		// Also return available filter options
		const [actions, resourceTypes] = await Promise.all([
			getAuditLogActions(),
			getAuditLogResourceTypes(),
		]);

		return NextResponse.json({
			...result,
			filters: {
				actions,
				resource_types: resourceTypes,
			},
		});
	} catch (error) {
		console.error('Error fetching audit logs:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

