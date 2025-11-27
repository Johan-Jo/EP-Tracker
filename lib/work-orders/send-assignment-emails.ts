import { sendEmail } from '@/lib/email/send';
import { getWorkOrderMapUrl } from './map';

interface SendWorkOrderAssignmentEmailsParams {
	workOrder: {
		id: string;
		title: string;
		work_order_number: string;
		project_id?: string | null;
		planned_start_at?: string | null;
		planned_end_at?: string | null;
		project?: { name?: string | null } | null;
		customer?: {
			type: 'COMPANY' | 'PRIVATE';
			company_name?: string | null;
			first_name?: string | null;
			last_name?: string | null;
		} | null;
		assignments?: Array<{
			user?: { id: string; full_name?: string | null; email?: string | null } | null;
		}> | null;
	};
	orgId: string;
	baseUrl?: string; // Optional: if provided, use this instead of env vars
}

function formatCustomerName(customer: SendWorkOrderAssignmentEmailsParams['workOrder']['customer']): string | null {
	if (!customer) return null;
	if (customer.type === 'COMPANY') {
		return customer.company_name || null;
	}
	const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
	return name || null;
}

function formatDateTimeRange(start?: string | null, end?: string | null): { start?: string | null; end?: string | null } {
	if (!start || !end) return { start: null, end: null };
	const fmt = new Intl.DateTimeFormat('sv-SE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
	return {
		start: fmt.format(new Date(start)),
		end: fmt.format(new Date(end)),
	};
}

export async function sendWorkOrderAssignmentEmails({ workOrder, orgId, baseUrl: providedBaseUrl }: SendWorkOrderAssignmentEmailsParams) {
	try {
		const assignments = workOrder.assignments || [];
		if (!assignments.length) {
			return;
		}

		// Use provided baseUrl, or NEXT_PUBLIC_SITE_URL, or VERCEL_URL, or localhost
		const baseUrl = providedBaseUrl 
			|| process.env.NEXT_PUBLIC_SITE_URL 
			|| (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
			|| 'http://localhost:3000';
		const workOrderUrl = `${baseUrl}/dashboard/work-orders/${workOrder.id}`;
		const todayWorkOrdersUrl = `${baseUrl}/dashboard/work-orders/today`;
		
		// Build time entry URL with pre-filled data
		const timeEntryParams = new URLSearchParams();
		timeEntryParams.set('work_order_id', workOrder.id);
		if (workOrder.project_id) {
			timeEntryParams.set('project_id', workOrder.project_id);
		}
		// Add planned times if available
		if (workOrder.planned_start_at) {
			timeEntryParams.set('start_at', workOrder.planned_start_at);
		}
		if (workOrder.planned_end_at) {
			timeEntryParams.set('stop_at', workOrder.planned_end_at);
		}
		const timeEntryUrl = `${baseUrl}/dashboard/time?${timeEntryParams.toString()}`;

		const customerName = formatCustomerName(workOrder.customer as any);
		const mapImageUrl = getWorkOrderMapUrl(workOrder as any);
		const { start, end } = formatDateTimeRange(workOrder.planned_start_at, workOrder.planned_end_at);

		for (const assignment of assignments) {
			const user = assignment.user;
			if (!user || !user.email) {
				continue;
			}

			const workerName = user.full_name || user.email;

			await sendEmail({
				to: user.email,
				toName: workerName,
				subject: `Ny arbetsorder: ${workOrder.title} (${workOrder.work_order_number})`,
				template: 'work-order-assignment',
				templateData: {
					workerName,
					workOrderTitle: workOrder.title,
					workOrderNumber: workOrder.work_order_number,
					projectName: (workOrder.project as any)?.name || null,
					customerName,
					addressLine: workOrder.location_address,
					mapImageUrl,
					plannedStart: start || null,
					plannedEnd: end || null,
					workOrderUrl,
					timeEntryUrl,
					todayWorkOrdersUrl,
				},
				organizationId: orgId,
				emailType: 'notification',
			}).catch((err) => {
				console.error('[sendWorkOrderAssignmentEmails] Failed to send assignment email to', user.email, err);
			});
		}
	} catch (error) {
		console.error('[sendWorkOrderAssignmentEmails] Error:', error);
	}
}


