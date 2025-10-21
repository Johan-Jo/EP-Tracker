/**
 * Maintenance Mode API
 * 
 * GET /api/super-admin/system/maintenance - Get current status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getMaintenanceStatus } from '@/lib/super-admin/maintenance';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const status = await getMaintenanceStatus();

		return NextResponse.json(status || { is_active: false, message: null });
	} catch (error) {
		console.error('Error fetching maintenance status:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

