/**
 * System Status API
 * 
 * GET /api/super-admin/system/status - Get system health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getSystemStatus } from '@/lib/super-admin/system-status';

export async function GET(request: NextRequest) {
	try {
		await requireSuperAdmin();

		const status = await getSystemStatus();

		return NextResponse.json(status);
	} catch (error) {
		console.error('Error fetching system status:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

