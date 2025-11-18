import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/invoice-links
 * Get Fortnox invoice link status for a locked invoice_basis
 * 
 * Query params:
 * - invoiceBasisId: Invoice basis ID (required)
 * 
 * Returns: fortnox_invoice_links record or null
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Admin, finance, and foreman can read (read-only for foreman)
		if (!['admin', 'finance', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const invoiceBasisId = searchParams.get('invoiceBasisId');

		if (!invoiceBasisId) {
			return NextResponse.json(
				{ error: 'invoiceBasisId parameter is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Verify invoice_basis belongs to org
		const { data: invoiceBasis, error: basisError } = await supabase
			.from('invoice_basis')
			.select('id, org_id')
			.eq('id', invoiceBasisId)
			.eq('org_id', membership.org_id)
			.single();

		if (basisError || !invoiceBasis) {
			return NextResponse.json(
				{ error: 'Fakturaunderlag hittades inte' },
				{ status: 404 }
			);
		}

		// Fetch fortnox_invoice_links
		const { data: link, error: linkError } = await supabase
			.from('fortnox_invoice_links')
			.select('*')
			.eq('org_id', membership.org_id)
			.eq('invoice_basis_id', invoiceBasisId)
			.single();

		if (linkError) {
			if (linkError.code === 'PGRST116') {
				// No rows returned - not exported yet
				return NextResponse.json({ data: null });
			}
			return NextResponse.json(
				{ error: 'Kunde inte hämta exportstatus' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ data: link });
	} catch (error) {
		console.error('Error fetching Fortnox invoice link:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/integrations/fortnox/invoice-links
 * Delete Fortnox invoice link status (to retry export after fixing issues)
 * 
 * Query params:
 * - invoiceBasisId: Invoice basis ID (required)
 */
export async function DELETE(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can delete export status
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const invoiceBasisId = searchParams.get('invoiceBasisId');

		if (!invoiceBasisId) {
			return NextResponse.json(
				{ error: 'invoiceBasisId parameter is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Verify invoice_basis belongs to org
		const { data: invoiceBasis, error: basisError } = await supabase
			.from('invoice_basis')
			.select('id, org_id')
			.eq('id', invoiceBasisId)
			.eq('org_id', membership.org_id)
			.single();

		if (basisError || !invoiceBasis) {
			return NextResponse.json(
				{ error: 'Fakturaunderlag hittades inte' },
				{ status: 404 }
			);
		}

		// Delete fortnox_invoice_links record
		const { error: deleteError } = await supabase
			.from('fortnox_invoice_links')
			.delete()
			.eq('org_id', membership.org_id)
			.eq('invoice_basis_id', invoiceBasisId);

		if (deleteError) {
			console.error('Failed to delete Fortnox invoice link:', deleteError);
			return NextResponse.json(
				{ error: 'Kunde inte radera exportstatus' },
				{ status: 500 }
			);
		}

		return NextResponse.json({ 
			success: true,
			message: 'Exportstatus raderad. Du kan nu försöka exportera igen.' 
		});
	} catch (error) {
		console.error('Error deleting Fortnox invoice link:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}


