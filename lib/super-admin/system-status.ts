/**
 * System Status & Health Monitoring
 * 
 * Monitor system health, database metrics, and errors.
 */

import { createClient } from '@/lib/supabase/server';

export interface SystemStatus {
	status: 'healthy' | 'warning' | 'error';
	uptime: number;
	timestamp: string;
	database: {
		status: 'connected' | 'disconnected';
		response_time_ms: number;
	};
	errors: RecentError[];
	metrics: SystemMetrics;
}

export interface RecentError {
	id: string;
	message: string;
	count: number;
	last_occurred: string;
}

export interface SystemMetrics {
	total_users: number;
	total_organizations: number;
	total_projects: number;
	active_subscriptions: number;
	total_storage_gb: number;
}

/**
 * Get overall system status
 */
export async function getSystemStatus(): Promise<SystemStatus> {
	const supabase = await createClient();

	// Check database connection
	const dbStart = Date.now();
	let dbStatus: 'connected' | 'disconnected' = 'connected';
	let dbResponseTime = 0;

	try {
		await supabase.from('profiles').select('id').limit(1);
		dbResponseTime = Date.now() - dbStart;
	} catch {
		dbStatus = 'disconnected';
		dbResponseTime = -1;
	}

	// Get metrics
	const metrics = await getSystemMetrics();

	// Get recent errors (simplified - you can expand this)
	const errors: RecentError[] = [];

	// Determine overall status
	let status: 'healthy' | 'warning' | 'error' = 'healthy';
	if (dbStatus === 'disconnected') {
		status = 'error';
	} else if (dbResponseTime > 1000) {
		status = 'warning';
	}

	return {
		status,
		uptime: process.uptime ? process.uptime() : 0,
		timestamp: new Date().toISOString(),
		database: {
			status: dbStatus,
			response_time_ms: dbResponseTime,
		},
		errors,
		metrics,
	};
}

/**
 * Get system metrics
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
	const supabase = await createClient();

	try {
		// Get counts for various entities
		const [usersResult, orgsResult, projectsResult, subsResult] = await Promise.all([
			supabase.from('profiles').select('id', { count: 'exact', head: true }),
			supabase.from('organizations').select('id', { count: 'exact', head: true }),
			supabase.from('projects').select('id', { count: 'exact', head: true }),
			supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
		]);

		// Calculate storage (simplified - sum of organization storage)
		const { data: storageData } = await supabase
			.from('organizations')
			.select('storage_used_bytes');

		const totalStorageBytes = (storageData || []).reduce(
			(sum: number, org: { storage_used_bytes?: number | null }) => sum + (org.storage_used_bytes || 0),
			0
		);

		return {
			total_users: usersResult.count || 0,
			total_organizations: orgsResult.count || 0,
			total_projects: projectsResult.count || 0,
			active_subscriptions: subsResult.count || 0,
			total_storage_gb: totalStorageBytes / (1024 * 1024 * 1024), // Convert to GB
		};
	} catch (error) {
		console.error('Error fetching system metrics:', error);
		return {
			total_users: 0,
			total_organizations: 0,
			total_projects: 0,
			active_subscriptions: 0,
			total_storage_gb: 0,
		};
	}
}

/**
 * Get database metrics
 */
export async function getDatabaseMetrics(): Promise<{
	size_mb: number;
	table_count: number;
	connection_count: number;
}> {
	const supabase = await createClient();

	try {
		// This would require database admin privileges to get real metrics
		// For now, return placeholder data
		return {
			size_mb: 0, // Would need to query pg_database_size
			table_count: 20, // Known from schema
			connection_count: 0, // Would need to query pg_stat_activity
		};
	} catch (error) {
		console.error('Error fetching database metrics:', error);
		return {
			size_mb: 0,
			table_count: 0,
			connection_count: 0,
		};
	}
}

