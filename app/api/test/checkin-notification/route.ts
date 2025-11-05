import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyOnCheckIn } from '@/lib/notifications/project-alerts';

/**
 * Test endpoint to debug check-in notifications
 * POST /api/test/checkin-notification
 * Body: { projectId: string, userId: string }
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only allow admins for testing
		const { data: membership } = await supabase
			.from('memberships')
			.select('role, org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership || membership.role !== 'admin') {
			return NextResponse.json({ error: 'Only admins can test notifications' }, { status: 403 });
		}

		const body = await request.json();
		const { projectId, userId } = body;

		if (!projectId || !userId) {
			return NextResponse.json({ error: 'projectId and userId required' }, { status: 400 });
		}

		// Get user profile
		const { data: profile } = await supabase
			.from('profiles')
			.select('full_name, email')
			.eq('id', userId)
			.single();

		if (!profile) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get project info
		const { data: project } = await supabase
			.from('projects')
			.select('id, name, org_id, alert_settings')
			.eq('id', projectId)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		// Verify project belongs to same org
		if (project.org_id !== membership.org_id) {
			return NextResponse.json({ error: 'Project belongs to different organization' }, { status: 403 });
		}

		const alertSettings = project.alert_settings as any;
		const debugInfo: any = {
			projectName: project.name,
			projectId: project.id,
			userName: profile.full_name || profile.email,
			userId: userId,
			alertSettings: {
				notify_on_checkin: alertSettings?.notify_on_checkin ?? 'not set',
				alert_recipients: alertSettings?.alert_recipients ?? 'not set',
			},
		};

		// Check for recipients - fix the join syntax
		const { data: recipients, error: recipientsError } = await supabase
			.from('memberships')
			.select(`
				user_id,
				role,
				profiles!memberships_user_id_fkey(email, full_name)
			`)
			.eq('org_id', membership.org_id)
			.eq('is_active', true)
			.in('role', alertSettings?.alert_recipients || ['admin', 'foreman']);

		if (recipientsError) {
			return NextResponse.json({ 
				error: 'Error fetching recipients', 
				details: recipientsError.message 
			}, { status: 500 });
		}

		debugInfo.recipients = recipients?.map((r: any) => ({
			email: r.profiles?.email,
			name: r.profiles?.full_name,
			role: r.role,
		})) || [];

		// Try to send notification
		let notificationResult = null;
		try {
			const notifyResult = await notifyOnCheckIn({
				projectId,
				userId,
				userName: profile.full_name || profile.email,
				checkinTime: new Date(),
			});
			notificationResult = {
				success: notifyResult?.success || false,
				sentCount: notifyResult?.sentCount || 0,
				failedCount: notifyResult?.failedCount || 0,
				results: notifyResult?.results || [],
				message: notifyResult?.success ? `Notification sent to ${notifyResult.sentCount} recipient(s)` : 'No notifications sent',
			};
		} catch (error: any) {
			notificationResult = { 
				success: false, 
				error: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
			};
		}

		return NextResponse.json({
			debug: debugInfo,
			notification: notificationResult,
		});
	} catch (error: any) {
		console.error('Error in test endpoint:', error);
		return NextResponse.json({ 
			error: error.message || 'Unknown error',
			stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
		}, { status: 500 });
	}
}

