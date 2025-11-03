import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export async function GET(request: NextRequest) {
	try {
		const t0 = Date.now();
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

		// EPIC 32: Export from attendance_session
		let query = supabase
			.from('attendance_session')
			.select('id, person_id, project_id, check_in_ts, check_out_ts, corrected, immutable_hash, profiles:person_id(full_name)')
			.eq('project_id', projectId)
			.order('check_in_ts', { ascending: true });
		if (from) query = query.gte('check_in_ts', from);
		if (to) query = query.lte('check_in_ts', to);
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

Projekt: ${project?.name || 'N/A'}
Period: ${period}
Exportdatum: ${new Date().toISOString()}
Hash (SHA256): ${hash}

Adress:
${[project?.address_line1, project?.address_line2, project?.postal_code, project?.city].filter(Boolean).join(', ')}

Personer:
${rows?.map((r: any) => `${r.profiles?.full_name || ''} | ${r.check_in_ts} - ${r.check_out_ts || 'Öppen'} | Korrigerad: ${r.corrected ? 'Ja' : 'Nej'} | Hash: ${r.immutable_hash || ''}`).join('\n') || 'Inga registreringar'}

---
Metadata: project_id=${projectId} period=${period} created=${nowIso} hash=${hash}`;

			const duration = Date.now() - t0;
			return new NextResponse(pdfContent, {
				status: 200,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Content-Disposition': `attachment; filename="worksite_${projectId}.txt"`,
					'X-Perf-ms': String(duration),
				},
			});
		}

		// CSV format with corrected + per-row hash
		const header = ['Namn','PersonID','In','Ut','Korrigerad','RadHash'];
		const lines = (rows || []).map(r => [
			(r as any).profiles?.full_name || '', (r as any).person_id, (r as any).check_in_ts, (r as any).check_out_ts || '', (r as any).corrected ? 'Ja' : 'Nej', (r as any).immutable_hash || ''
		].map(v => `"${String(v ?? '')}"`).join(','));
		const csv = [header.join(','), ...lines].join('\n');
		const footer = `\n# project_id=${projectId} period=${period} created=${nowIso} hash=${hash}`;
		const duration = Date.now() - t0;
		return new NextResponse(csv + footer, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="worksite_${projectId}.csv"`,
				'X-Perf-ms': String(duration),
			},
		});
	} catch (e) {
		console.error('GET /api/exports/worksite error', e);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
