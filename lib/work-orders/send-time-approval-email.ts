import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { generateApprovalToken } from '@/lib/work-orders/generate-approval-token';
import { getWorkOrderMapUrl } from './map';

interface SendWorkOrderTimeApprovalEmailParams {
	supabase: SupabaseClient;
	workOrderId: string;
	orgId: string;
}

/**
 * Send time approval email to assigned workers for a work order
 * This is called after time entries are created/updated for a work order
 */
export async function sendWorkOrderTimeApprovalEmail({
	supabase,
	workOrderId,
	orgId,
}: SendWorkOrderTimeApprovalEmailParams) {
	try {
		// Fetch work order with all necessary data
		const { data: workOrder, error: workOrderError } = await supabase
			.from('work_orders')
			.select(`
				id,
				title,
				work_order_number,
				planned_start_at,
				planned_end_at,
				actual_start_at,
				actual_end_at,
				send_time_approval_email,
				actual_time_approval_sent_at,
				location_address,
				location_city,
				location_zip,
				location_lat,
				location_lng,
				project:projects(id, name),
				assignments:work_order_assignments(
					user_id,
					user:profiles(id, full_name, email)
				)
			`)
			.eq('id', workOrderId)
			.single();

		if (workOrderError || !workOrder) {
			console.error('[sendWorkOrderTimeApprovalEmail] Error fetching work order:', workOrderError);
			return;
		}

		// Check if email should be sent
		if (!workOrder.send_time_approval_email) {
			console.log('[sendWorkOrderTimeApprovalEmail] Email disabled for work order:', workOrderId);
			return;
		}

		// Check if email already sent
		if (workOrder.actual_time_approval_sent_at) {
			console.log('[sendWorkOrderTimeApprovalEmail] Email already sent for work order:', workOrderId);
			return;
		}

		// CRITICAL: Only send email AFTER planned end time has passed
		if (workOrder.planned_end_at) {
			const plannedEnd = new Date(workOrder.planned_end_at);
			const now = new Date();
			if (now < plannedEnd) {
				console.log('[sendWorkOrderTimeApprovalEmail] Planned end time has not passed yet for work order:', workOrderId, {
					plannedEnd: plannedEnd.toISOString(),
					now: now.toISOString(),
				});
				return;
			}
		} else {
			// If no planned_end_at, we can't determine when to send - skip
			console.log('[sendWorkOrderTimeApprovalEmail] No planned_end_at for work order:', workOrderId);
			return;
		}

		// Check if there are completed time entries (with stop_at) for this work order
		// This ensures we only send email when actual work has been completed
		const { data: timeEntries, error: timeEntriesError } = await supabase
			.from('time_entries')
			.select('start_at, stop_at')
			.eq('work_order_id', workOrderId)
			.not('stop_at', 'is', null);

		if (timeEntriesError || !timeEntries || timeEntries.length === 0) {
			console.log('[sendWorkOrderTimeApprovalEmail] No completed time entries yet for work order:', workOrderId);
			return;
		}

		// Calculate actual times from time entries
		const actualStart = new Date(Math.min(...timeEntries.map((e) => new Date(e.start_at).getTime())));
		const actualEnd = new Date(Math.max(...timeEntries.map((e) => new Date(e.stop_at).getTime())));

		// Get assigned workers
		const assignments = workOrder.assignments || [];
		if (assignments.length === 0) {
			console.log('[sendWorkOrderTimeApprovalEmail] No assigned workers for work order:', workOrderId);
			return;
		}

		// Calculate durations
		const plannedStart = workOrder.planned_start_at ? new Date(workOrder.planned_start_at) : null;
		const plannedEnd = workOrder.planned_end_at ? new Date(workOrder.planned_end_at) : null;

		const plannedDurationMs = plannedStart && plannedEnd ? plannedEnd.getTime() - plannedStart.getTime() : 0;
		const actualDurationMs = actualEnd.getTime() - actualStart.getTime();
		const timeDifferenceMs = actualDurationMs - plannedDurationMs;
		const timeDifferenceMinutes = Math.round(timeDifferenceMs / (1000 * 60));

		// Format durations
		const formatDuration = (ms: number) => {
			const hours = Math.floor(ms / (1000 * 60 * 60));
			const minutes = Math.round((ms % (1000 * 60 * 60)) / (1000 * 60));
			if (hours === 0) return `${minutes} min`;
			if (minutes === 0) return `${hours} h`;
			return `${hours} h ${minutes} min`;
		};

		const formatTimeDifference = (minutes: number) => {
			const absMinutes = Math.abs(minutes);
			const hours = Math.floor(absMinutes / 60);
			const mins = absMinutes % 60;
			const sign = minutes >= 0 ? '+' : '-';
			if (hours === 0) return `${sign}${mins} min`;
			if (mins === 0) return `${sign}${hours} h`;
			return `${sign}${hours} h ${mins} min`;
		};

		const plannedDuration = plannedDurationMs > 0 ? formatDuration(plannedDurationMs) : 'Ej planerad';
		const actualDuration = formatDuration(actualDurationMs);
		const timeDifference = formatTimeDifference(timeDifferenceMinutes);
		const mapImageUrl = getWorkOrderMapUrl(workOrder as any);

		// Format dates
		const formatDateTime = (date: Date) => {
			return new Intl.DateTimeFormat('sv-SE', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			}).format(date);
		};

		// Generate approval token for each worker
		const approvalToken = await generateApprovalToken(supabase, workOrderId);

		// Update work order with token and sent timestamp
		// Use a conditional update to prevent race conditions - only update if sent_at is still NULL
		const { error: updateError } = await supabase
			.from('work_orders')
			.update({
				actual_time_approval_token: approvalToken,
				actual_time_approval_sent_at: new Date().toISOString(),
			})
			.eq('id', workOrderId)
			.is('actual_time_approval_sent_at', null); // Only update if not already sent

		// If update failed (likely because another process already sent the email), abort
		if (updateError) {
			console.log('[sendWorkOrderTimeApprovalEmail] Email already sent by another process:', workOrderId);
			return;
		}

		// Send email to each assigned worker
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
		const approveUrl = `${baseUrl}/dashboard/work-orders/${workOrderId}/approve-time?token=${approvalToken}`;
		const adjustUrl = `${baseUrl}/dashboard/work-orders/${workOrderId}/adjust-time?token=${approvalToken}`;

		for (const assignment of assignments) {
			const worker = assignment.user;
			if (!worker || !worker.email) {
				console.warn('[sendWorkOrderTimeApprovalEmail] Worker missing email:', assignment.user_id);
				continue;
			}

			const subject = `Bekräfta registrerad tid för arbetsorder ${workOrder.work_order_number}`;

			await sendEmail({
				to: worker.email,
				toName: worker.full_name || worker.email,
				subject,
				template: 'work-order-time-approval',
				templateData: {
					workerName: worker.full_name || worker.email,
					workOrderTitle: workOrder.title,
					workOrderNumber: workOrder.work_order_number,
					projectName: (workOrder.project as any)?.name || null,
					plannedStart: plannedStart ? formatDateTime(plannedStart) : 'Ej planerad',
					plannedEnd: plannedEnd ? formatDateTime(plannedEnd) : 'Ej planerad',
					plannedDuration,
					actualStart: formatDateTime(actualStart),
					actualEnd: formatDateTime(actualEnd),
					actualDuration,
					timeDifference,
					timeDifferenceMinutes,
					mapImageUrl,
					approveUrl,
					adjustUrl,
				},
				organizationId: orgId,
				emailType: 'notification',
			}).catch((error) => {
				console.error('[sendWorkOrderTimeApprovalEmail] Failed to send email to', worker.email, error);
			});
		}

		console.log(`[sendWorkOrderTimeApprovalEmail] Sent approval emails for work order ${workOrder.work_order_number}`);
	} catch (error) {
		console.error('[sendWorkOrderTimeApprovalEmail] Error:', error);
	}
}

