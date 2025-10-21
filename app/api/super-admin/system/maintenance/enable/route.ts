/**
 * Enable Maintenance Mode API
 * 
 * POST /api/super-admin/system/maintenance/enable
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { enableMaintenanceMode } from '@/lib/super-admin/maintenance';
import { z } from 'zod';

const enableSchema = z.object({
	message: z.string().optional(),
	scheduled_start: z.string().optional(),
	scheduled_end: z.string().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdmin();

		const body = await request.json();
		const validated = enableSchema.parse(body);

		const status = await enableMaintenanceMode(validated, superAdmin.user_id);

		return NextResponse.json(status);
	} catch (error) {
		console.error('Error enabling maintenance mode:', error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Valideringsfel', details: error.errors },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

