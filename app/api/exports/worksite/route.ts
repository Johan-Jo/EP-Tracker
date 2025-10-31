import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const { projectId, from, to } = body || {};
		if (!projectId) {
			return NextResponse.json({ error: 'projectId required' }, { status: 400 });
		}
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		// Fetch sessions via time_entries quickly
		let query = supabase
			.from('time_entries')
			.select('id, user_id, project_id, start_at, stop_at, profiles(full_name)')
			.eq('project_id', projectId)
			.order('start_at', { ascending: true });
		if (from) query = query.gte('start_at', from);
		if (to) query = query.lte('start_at', to);
		const { data: rows, error } = await query;
		if (error) return NextResponse.json({ error: error.message }, { status: 500 });

		const period = `${from || ''}..${to || ''}`;
		const nowIso = new Date().toISOString();
		// Simple hash placeholder (real impl: sha256 over payload)
		const hash = Buffer.from(`${projectId}|${period}|${nowIso}`).toString('base64url');
		const header = ['Namn','PersonID','In','Ut'];
		const lines = (rows || []).map(r => [
			(r as any).profiles?.full_name || '', r.user_id, r.start_at, r.stop_at || ''
		].map(v => `"${String(v ?? '')}"`).join(','));
		const csv = [header.join(','), ...lines].join('\n');
		const footer = `\n# project_id=${projectId} period=${period} created=${nowIso} hash=${hash}`;
		return new NextResponse(csv + footer, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="worksite_${projectId}.csv"`,
			},
		});
	} catch (e) {
		console.error('POST /api/exports/worksite error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
