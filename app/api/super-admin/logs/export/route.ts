/**
 * Audit Logs Export API
 * 
 * POST /api/super-admin/logs/export - Export audit logs to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getAuditLogs, exportAuditLogsToCsv } from '@/lib/super-admin/audit-logs';

export async function POST(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const body = await request.json();
		const filters = body.filters || {};

		// Get ALL logs matching filters (no pagination for export)
		const { logs } = await getAuditLogs({
			...filters,
			limit: 10000, // Export max 10k logs
			offset: 0,
		});

		const csv = exportAuditLogsToCsv(logs);

		// Return CSV file
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
			},
		});
	} catch (error) {
		console.error('Error exporting audit logs:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

