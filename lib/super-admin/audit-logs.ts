/**
 * Audit Log System
 * 
 * Track and query all super admin actions.
 */

import { createClient } from '@/lib/supabase/server';

export interface AuditLog {
	id: string;
	admin_id: string | null;
	action: string;
	resource_type: string | null;
	resource_id: string | null;
	metadata: Record<string, unknown> | null;
	created_at: string;
	admin_email?: string;
	admin_name?: string;
}

export interface AuditLogFilters {
	admin_id?: string;
	action?: string;
	resource_type?: string;
	start_date?: string;
	end_date?: string;
	limit?: number;
	offset?: number;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<{
	logs: AuditLog[];
	total: number;
}> {
	const supabase = await createClient();

	let query = supabase
		.from('super_admin_audit_log')
		.select(`
			*,
			admin:super_admins!super_admin_audit_log_admin_id_fkey(
				user_id,
				user:profiles!super_admins_user_id_fkey(
					email,
					full_name
				)
			)
		`, { count: 'exact' });

	// Apply filters
	if (filters.admin_id) {
		query = query.eq('admin_id', filters.admin_id);
	}
	if (filters.action) {
		query = query.eq('action', filters.action);
	}
	if (filters.resource_type) {
		query = query.eq('resource_type', filters.resource_type);
	}
	if (filters.start_date) {
		query = query.gte('created_at', filters.start_date);
	}
	if (filters.end_date) {
		query = query.lte('created_at', filters.end_date);
	}

	// Order and pagination
	query = query
		.order('created_at', { ascending: false })
		.range(
			filters.offset || 0,
			(filters.offset || 0) + (filters.limit || 50) - 1
		);

	const { data, error, count } = await query;

	if (error) {
		console.error('Error fetching audit logs:', error);
		throw new Error('Kunde inte hämta granskningsloggar');
	}

	// Transform data to include admin info
	const logs: AuditLog[] = (data || []).map((log) => ({
		...log,
		admin_email: log.admin?.user?.email,
		admin_name: log.admin?.user?.full_name,
	}));

	return {
		logs,
		total: count || 0,
	};
}

/**
 * Get unique action types for filtering
 */
export async function getAuditLogActions(): Promise<string[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('super_admin_audit_log')
		.select('action')
		.order('action');

	if (error) {
		console.error('Error fetching audit log actions:', error);
		return [];
	}

	// Get unique actions
	const actions = Array.from(new Set((data || []).map((log) => log.action)));
	return actions.filter(Boolean) as string[];
}

/**
 * Get unique resource types for filtering
 */
export async function getAuditLogResourceTypes(): Promise<string[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('super_admin_audit_log')
		.select('resource_type')
		.order('resource_type');

	if (error) {
		console.error('Error fetching resource types:', error);
		return [];
	}

	// Get unique resource types
	const types = Array.from(new Set((data || []).map((log) => log.resource_type)));
	return types.filter(Boolean) as string[];
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCsv(logs: AuditLog[]): string {
	const headers = ['Tidpunkt', 'Admin', 'Action', 'Resurs', 'Resurs ID', 'Metadata'];
	const rows = logs.map(log => [
		new Date(log.created_at).toLocaleString('sv-SE'),
		log.admin_name || log.admin_email || 'Okänd',
		log.action,
		log.resource_type || '',
		log.resource_id || '',
		log.metadata ? JSON.stringify(log.metadata) : '',
	]);

	const csvContent = [
		headers.join(','),
		...rows.map(row => row.map(cell => `"${cell}"`).join(','))
	].join('\n');

	return csvContent;
}

/**
 * Log a super admin action
 * (This is used by other super admin functions)
 */
export async function logAuditAction(
	adminId: string,
	action: string,
	resourceType?: string,
	resourceId?: string,
	metadata?: Record<string, unknown>
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from('super_admin_audit_log')
		.insert({
			admin_id: adminId,
			action,
			resource_type: resourceType || null,
			resource_id: resourceId || null,
			metadata: metadata || null,
		});

	if (error) {
		console.error('Error logging audit action:', error);
		// Don't throw - we don't want to fail the main action because of logging
	}
}

