/**
 * Feature Flags API
 * 
 * GET /api/super-admin/system/features - List all feature flags
 * POST /api/super-admin/system/features - Create a new feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, requireSuperAdminWithDetails } from '@/lib/auth/super-admin';
import { getFeatureFlags, createFeatureFlag } from '@/lib/super-admin/feature-flags';
import { z } from 'zod';

const createFlagSchema = z.object({
	flag_name: z.string().min(1, 'Flag name krävs'),
	is_enabled: z.boolean().optional(),
	description: z.string().optional(),
});

export async function GET(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdmin();

		const flags = await getFeatureFlags();

		return NextResponse.json(flags);
	} catch (error) {
		console.error('Error fetching feature flags:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdminWithDetails();

		const body = await request.json();
		const validated = createFlagSchema.parse(body);

		const flag = await createFeatureFlag(validated, superAdmin.user_id);

		return NextResponse.json(flag, { status: 201 });
	} catch (error) {
		console.error('Error creating feature flag:', error);
		
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

