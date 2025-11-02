import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

		// TODO: In EPIC 32, create/update attendance_session table
		// For now, just log to time_entries or audit_log as a placeholder
		
		// Log check-in event to audit_log
		const { error: auditError } = await supabase
			.from('audit_log')
			.insert({
				org_id: project.org_id,
				user_id: user_id,
				action: 'worksite_checkin',
				entity_type: 'project_checkin',
				entity_id: project_id,
				new_data: {
					check_in_ts,
					source: source || 'qr_scan',
					timestamp: new Date().toISOString(),
				},
			});

		if (auditError) {
			console.error('Error logging check-in:', auditError);
			return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
		}

		return NextResponse.json({ 
			success: true,
			check_in_ts,
		}, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/worksites/checkin:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

