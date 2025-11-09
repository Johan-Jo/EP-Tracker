/**
 * Single Feature Flag API
 * 
 * PATCH /api/super-admin/system/features/[flag] - Toggle a feature flag
 * DELETE /api/super-admin/system/features/[flag] - Delete a feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, requireSuperAdminWithDetails } from '@/lib/auth/super-admin';
import { toggleFeatureFlag, deleteFeatureFlag } from '@/lib/super-admin/feature-flags';
import { z } from 'zod';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const toggleSchema = z.object({
	is_enabled: z.boolean(),
});

type RouteParams = { flag: string };

export async function PATCH(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const superAdmin = await requireSuperAdminWithDetails();
    const { flag } = await resolveRouteParams(context);

		if (!flag) {
			return NextResponse.json(
				{ error: 'Feature flag name is required' },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { is_enabled } = toggleSchema.parse(body);

		const updated = await toggleFeatureFlag(flag, is_enabled, superAdmin.user_id);

		return NextResponse.json(updated);
	} catch (error) {
		console.error('Error toggling feature flag:', error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Valideringsfel', details: error.issues },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		await requireSuperAdmin();
    const { flag } = await resolveRouteParams(context);

		if (!flag) {
			return NextResponse.json(
				{ error: 'Feature flag name is required' },
				{ status: 400 }
			);
		}

		await deleteFeatureFlag(flag);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting feature flag:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

