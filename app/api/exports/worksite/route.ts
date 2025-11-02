import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('projectId');
		const from = searchParams.get('from');
		const to = searchParams.get('to');
		const format = searchParams.get('format') || 'csv';

		if (!projectId) {
			return NextResponse.json({ error: 'projectId required' }, { status: 400 });
		}

		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Fetch project info for address
		const { data: project } = await supabase
			.from('projects')
			.select('name, address_line1, address_line2, city, postal_code')
			.eq('id', projectId)
			.single();

		// Fetch sessions via time_entries (will switch to attendance_session after EPIC 32)
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
		
		// Generate proper sha256 hash
		const payload = JSON.stringify({ projectId, period, rows });
		const hash = createHash('sha256').update(payload).digest('hex');

		if (format === 'pdf') {
			// For now, return simple PDF using text format
			// TODO: Implement proper PDF with library when installed
			const pdfContent = `Personalliggare - Kontrollvy

Projekt: ${project.name || 'N/A'}
Period: ${period}
Exportdatum: ${new Date().toISOString()}
Hash (SHA256): ${hash}

Adress:
${[project?.address_line1, project?.address_line2, project?.postal_code, project?.city].filter(Boolean).join(', ')}

Personer:
${rows?.map((r: any) => `${r.profiles?.full_name || ''} | ${r.start_at} - ${r.stop_at || 'Öppen'}`).join('\n') || 'Inga registreringar'}

---
Metadata: project_id=${projectId} period=${period} created=${nowIso} hash=${hash}`;

			return new NextResponse(pdfContent, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Content-Disposition': `attachment; filename="worksite_${projectId}.txt"`,
				},
			});
		}

		// CSV format (original)
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
		console.error('GET /api/exports/worksite error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
