import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { generateApprovalToken } from '@/lib/work-orders/generate-approval-token';
import { getWorkOrderMapUrl } from './map';

interface SendWorkOrderManagerApprovalEmailParams {
	supabase: SupabaseClient;
	workOrderId: string;
	orgId: string;
	baseUrl?: string; // Optional: if provided, use this instead of env vars
}

/**
 * Send manager approval email for a work order after worker has confirmed their time
 * This is called after the worker confirms their registered time
 */
export async function sendWorkOrderManagerApprovalEmail({
	supabase,
	workOrderId,
	orgId,
	baseUrl: providedBaseUrl,
}: SendWorkOrderManagerApprovalEmailParams) {
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
				actual_time_worker_confirmed_at,
				actual_time_worker_confirmed_by_id,
				actual_time_manager_approval_sent_at,
				location_address,
				location_city,
				location_zip,
				location_lat,
				location_lng,
				project:projects(id, name),
				worker:profiles!actual_time_worker_confirmed_by_id(id, full_name, email)
			`)
			.eq('id', workOrderId)
			.single();

		if (workOrderError || !workOrder) {
			console.error('[sendWorkOrderManagerApprovalEmail] Error fetching work order:', workOrderError);
			return;
		}

		// Check if worker has confirmed
		if (!workOrder.actual_time_worker_confirmed_at || !workOrder.actual_time_worker_confirmed_by_id) {
			console.log('[sendWorkOrderManagerApprovalEmail] Worker has not confirmed yet for work order:', workOrderId);
			return;
		}

		// Check if email already sent
		if (workOrder.actual_time_manager_approval_sent_at) {
			console.log('[sendWorkOrderManagerApprovalEmail] Email already sent for work order:', workOrderId);
			return;
		}

		// Get worker info
		const worker = workOrder.worker as any;
		if (!worker) {
			console.log('[sendWorkOrderManagerApprovalEmail] Worker not found for work order:', workOrderId);
			return;
		}

		// Calculate actual times
		if (!workOrder.actual_start_at || !workOrder.actual_end_at) {
			console.log('[sendWorkOrderManagerApprovalEmail] No actual times available for work order:', workOrderId);
			return;
		}

		const actualStart = new Date(workOrder.actual_start_at);
		const actualEnd = new Date(workOrder.actual_end_at);

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

		// Get managers/admins for this organization
		// We'll send to all admins/managers in the organization
		const { data: managers, error: managersError } = await supabase
			.from('memberships')
			.select(`
				user_id,
				user:profiles(id, full_name, email)
			`)
			.eq('org_id', orgId)
			.eq('is_active', true)
			.in('role', ['admin', 'manager', 'owner']);

		if (managersError || !managers || managers.length === 0) {
			console.log('[sendWorkOrderManagerApprovalEmail] No managers found for organization:', orgId);
			return;
		}

		// Generate approval token
		const approvalToken = await generateApprovalToken(supabase, workOrderId);

		// Update work order with token and sent timestamp
		// Use a conditional update to prevent race conditions
		const { error: updateError } = await supabase
			.from('work_orders')
			.update({
				actual_time_manager_approval_token: approvalToken,
				actual_time_manager_approval_sent_at: new Date().toISOString(),
			})
			.eq('id', workOrderId)
			.is('actual_time_manager_approval_sent_at', null); // Only update if not already sent

		// If update failed (likely because another process already sent the email), abort
		if (updateError) {
			console.log('[sendWorkOrderManagerApprovalEmail] Email already sent by another process:', workOrderId);
			return;
		}

		// Send email to each manager/admin
		// Use provided baseUrl, or NEXT_PUBLIC_SITE_URL, or VERCEL_URL, or localhost
		const baseUrl = providedBaseUrl 
			|| process.env.NEXT_PUBLIC_SITE_URL 
			|| (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
			|| 'http://localhost:3000';
		const approveUrl = `${baseUrl}/dashboard/work-orders/${workOrderId}/approve-time-manager?token=${approvalToken}`;
		const reviewUrl = `${baseUrl}/dashboard/work-orders/${workOrderId}`;

		for (const membership of managers) {
			const manager = membership.user as any;
			if (!manager || !manager.email) {
				console.warn('[sendWorkOrderManagerApprovalEmail] Manager missing email:', membership.user_id);
				continue;
			}

			const subject = `Godkänn registrerad tid för arbetsorder ${workOrder.work_order_number} - ${worker.full_name || worker.email} har bekräftat`;

			await sendEmail({
				to: manager.email,
				toName: manager.full_name || manager.email,
				subject,
				template: 'work-order-time-manager-approval',
				templateData: {
					managerName: manager.full_name || manager.email,
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
					reviewUrl,
				},
				organizationId: orgId,
				emailType: 'notification',
			}).catch((error) => {
				console.error('[sendWorkOrderManagerApprovalEmail] Failed to send email to', manager.email, error);
			});
		}

		console.log(`[sendWorkOrderManagerApprovalEmail] Sent manager approval emails for work order ${workOrder.work_order_number}`);
	} catch (error) {
		console.error('[sendWorkOrderManagerApprovalEmail] Error:', error);
	}
}

