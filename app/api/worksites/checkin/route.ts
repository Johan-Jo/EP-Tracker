import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

// POST /api/worksites/checkin - Record check-in from QR scan
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { project_id, user_id, check_in_ts, source } = body;

		if (!project_id || !user_id || !check_in_ts) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Verify project has worksite enabled
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id, worksite_enabled, org_id')
			.eq('id', project_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		if (!project.worksite_enabled) {
			return NextResponse.json({ error: 'Worksite not enabled for this project' }, { status: 403 });
		}

		// Verify user belongs to project's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user_id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		// Ensure no open session exists for this user on this project
		const { data: openExisting } = await supabase
			.from('attendance_session')
			.select('id')
			.eq('org_id', project.org_id)
			.eq('project_id', project_id)
			.eq('person_id', user_id)
			.is('check_out_ts', null)
			.limit(1);

		if (openExisting && openExisting.length > 0) {
			// Idempotent success if already checked in
			return NextResponse.json({ success: true, already_open: true }, { status: 200 });
		}

		// Create new attendance_session (open)
		const nowIso = check_in_ts || new Date().toISOString();
		const basePayload = { org_id: project.org_id, project_id, person_id: user_id, check_in_ts: nowIso };
		const rowHash = createHash('sha256').update(JSON.stringify({ ...basePayload, check_out_ts: null })).digest('hex');
		const { data: inserted, error: insertError } = await supabase
			.from('attendance_session')
			.insert({
				...basePayload,
				check_out_ts: null,
				corrected: false,
				immutable_hash: rowHash,
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating attendance_session:', insertError);
			return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
		}

		// Log check-in event to audit_log (best-effort)
		await supabase
			.from('audit_log')
			.insert({
				org_id: project.org_id,
				user_id: user_id,
				action: 'worksite_checkin',
				entity_type: 'attendance_session',
				entity_id: inserted?.id,
				new_data: {
					project_id,
					check_in_ts: nowIso,
					source: source || 'qr_scan',
				},
			});

		return NextResponse.json({ success: true, session_id: inserted?.id, check_in_ts: nowIso }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/worksites/checkin:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

