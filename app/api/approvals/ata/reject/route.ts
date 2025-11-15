import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
		}

		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json(
				{ error: 'Endast administratörer och arbetsledare kan avvisa ÄTA' },
				{ status: 403 }
			);
		}

		const { ata_ids, comments } = await request.json();

		if (!ata_ids || !Array.isArray(ata_ids) || ata_ids.length === 0) {
			return NextResponse.json(
				{ error: 'Välj minst en ÄTA att avvisa' },
				{ status: 400 }
			);
		}

		if (!comments || comments.trim().length === 0) {
			return NextResponse.json(
				{ error: 'Kommentarer krävs för avslag' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		const updateData: Record<string, unknown> = {
			status: 'rejected',
			approved_by: user.id,
			approved_at: new Date().toISOString(),
			comments: comments.trim(),
		};

		const { data, error } = await supabase
			.from('ata')
			.update(updateData)
			.in('id', ata_ids)
			.eq('org_id', membership.org_id)
			.select('id');

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true, rejected_count: data?.length || 0 });
	} catch (error) {
		console.error('Rejection error:', error);
		return NextResponse.json({ error: 'Ett oväntat fel uppstod' }, { status: 500 });
	}
}

