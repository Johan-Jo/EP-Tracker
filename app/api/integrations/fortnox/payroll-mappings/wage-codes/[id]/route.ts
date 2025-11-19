import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * DELETE /api/integrations/fortnox/payroll-mappings/wage-codes/[id]
 * Delete a wage code mapping
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: 'ID krävs' }, { status: 400 });
		}

		const supabase = await createClient();

		const { error } = await supabase
			.from('fortnox_wage_code_mappings')
			.delete()
			.eq('id', id)
			.eq('org_id', membership.org_id);

		if (error) {
			console.error('Error deleting wage code mapping:', error);
			return NextResponse.json(
				{ error: 'Kunde inte ta bort mappning' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('[Fortnox Payroll Mappings] Error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

