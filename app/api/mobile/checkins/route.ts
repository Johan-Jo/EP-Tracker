import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mobileCheckinSchema } from '@/lib/schemas/planning';
import { notifyOnCheckIn, notifyOnCheckOut } from '@/lib/notifications/project-alerts';

// POST /api/mobile/checkins - Record check-in or check-out event
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user's organization
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = mobileCheckinSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Verify assignment exists and belongs to user, and fetch project_id and user profile
		const { data: assignment, error: assignmentError } = await supabase
			.from('assignments')
			.select('id, org_id, user_id, status, project_id, start_ts')
			.eq('id', data.assignment_id)
			.eq('org_id', membership.org_id)
			.eq('user_id', user.id)
			.single();

		if (assignmentError || !assignment) {
			return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
		}

		// Get user profile for name
		const { data: profile } = await supabase
			.from('profiles')
			.select('full_name')
			.eq('id', user.id)
			.single();

		// Check for duplicate check-in within 1 minute (idempotency)
		const oneMinuteAgo = new Date(new Date(data.ts).getTime() - 60000).toISOString();
		const oneMinuteAfter = new Date(new Date(data.ts).getTime() + 60000).toISOString();

		const { data: recentCheckIns } = await supabase
			.from('audit_log')
			.select('id')
			.eq('entity_type', 'assignment_checkin')
			.eq('entity_id', data.assignment_id)
			.eq('user_id', user.id)
			.gte('created_at', oneMinuteAgo)
			.lte('created_at', oneMinuteAfter)
			.eq('action', `checkin_${data.event}`);

		if (recentCheckIns && recentCheckIns.length > 0) {
			// Duplicate check-in, return success (idempotent)
			return NextResponse.json({ 
				success: true, 
				message: 'Check-in already recorded' 
			}, { status: 200 });
		}

		// Update assignment status based on event
		let newStatus = assignment.status;
		if (data.event === 'check_in' && assignment.status === 'planned') {
			newStatus = 'in_progress';
		} else if (data.event === 'check_out' && assignment.status === 'in_progress') {
			newStatus = 'done';
		}

		// Update assignment if status changed
		if (newStatus !== assignment.status) {
			await supabase
				.from('assignments')
				.update({ status: newStatus })
				.eq('id', data.assignment_id);
		}

		// Log check-in event to audit log
		const { error: auditError } = await supabase
			.from('audit_log')
			.insert({
				org_id: membership.org_id,
				user_id: user.id,
				action: `checkin_${data.event}`,
				entity_type: 'assignment_checkin',
				entity_id: data.assignment_id,
				new_data: {
					event: data.event,
					timestamp: data.ts,
					status_change: newStatus !== assignment.status ? { from: assignment.status, to: newStatus } : null,
				},
			});

		if (auditError) {
			console.error('Error logging check-in:', auditError);
			// Don't fail the request if audit log fails
		}

		// Send email/push notifications for check-in/check-out events
		const checkinTime = new Date(data.ts);
		const userName = profile?.full_name || user.email || 'Okänd användare';

		if (data.event === 'check_in' && assignment.project_id) {
			// Send check-in notification
			console.log(`🔔 Triggering check-in notification for user ${user.id} on project ${assignment.project_id}`);
			notifyOnCheckIn({
				projectId: assignment.project_id,
				userId: user.id,
				userName,
				checkinTime,
			}).catch((error) => {
				// Don't fail the request if notification fails
				console.error('❌ Failed to send check-in notification:', error);
				console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
			});
		} else if (data.event === 'check_out' && assignment.project_id) {
			// Calculate hours worked from actual check-in time (from audit log)
			let hoursWorked = 0;
			
			// Find the first check-in event for this assignment
			const { data: checkInLog } = await supabase
				.from('audit_log')
				.select('created_at, new_data')
				.eq('entity_type', 'assignment_checkin')
				.eq('entity_id', data.assignment_id)
				.eq('user_id', user.id)
				.eq('action', 'checkin_check_in')
				.order('created_at', { ascending: true })
				.limit(1)
				.single();

			if (checkInLog?.created_at) {
				const startTime = new Date(checkInLog.created_at);
				const endTime = checkinTime;
				hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
			} else if (assignment.start_ts) {
				// Fallback to assignment start_ts if no check-in log found
				const startTime = new Date(assignment.start_ts);
				const endTime = checkinTime;
				hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
			}

			// Send check-out notification
			notifyOnCheckOut({
				projectId: assignment.project_id,
				userId: user.id,
				userName,
				checkoutTime: checkinTime,
				hoursWorked: Math.max(0, hoursWorked), // Ensure non-negative
			}).catch((error) => {
				// Don't fail the request if notification fails
				console.error('Failed to send check-out notification:', error);
			});
		}

		return NextResponse.json({ 
			success: true,
			status: newStatus,
		}, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/mobile/checkins:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

