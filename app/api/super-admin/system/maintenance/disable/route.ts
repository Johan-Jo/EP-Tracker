/**
 * Disable Maintenance Mode API
 * 
 * POST /api/super-admin/system/maintenance/disable
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { disableMaintenanceMode } from '@/lib/super-admin/maintenance';

export async function POST(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const status = await disableMaintenanceMode();

		return NextResponse.json(status);
	} catch (error) {
		console.error('Error disabling maintenance mode:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

