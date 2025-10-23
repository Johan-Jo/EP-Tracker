/**
 * Exit Impersonation API
 * 
 * POST /api/super-admin/support/exit-impersonate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminWithDetails } from '@/lib/auth/super-admin';
import { endImpersonation } from '@/lib/super-admin/impersonation';

export async function POST(request: NextRequest) {
	try {
		const superAdmin = await requireSuperAdminWithDetails();

		await endImpersonation(superAdmin.user_id);

		return NextResponse.json({
			success: true,
			redirect: '/super-admin',
		});
	} catch (error) {
		console.error('Error ending impersonation:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Ett fel uppstod' },
			{ status: 500 }
		);
	}
}

