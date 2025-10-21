/**
 * Performance Metrics Analytics
 * 
 * Track system performance, API response times, and error rates.
 */

import { createClient } from '@/lib/supabase/server';
import type { PerformanceMetrics } from './analytics-types';

/**
 * Get API performance metrics
 * Calculates average response times for common API endpoints
 */
export async function getApiPerformanceMetrics(): Promise<PerformanceMetrics[]> {
	// In a production system, you would track these metrics using:
	// - Application Performance Monitoring (APM) tools like New Relic, Datadog
	// - Custom logging/timing middleware
	// - Database query performance logs
	
	// For now, we return simulated/example metrics
	// These could be replaced with real metrics from your logging system

	const metrics: PerformanceMetrics[] = [
		{
			metric_name: 'GET /api/time-entries',
			avg_value: 245,
			p50: 180,
			p95: 450,
			p99: 850,
			unit: 'ms',
		},
		{
			metric_name: 'POST /api/time-entries',
			avg_value: 180,
			p50: 150,
			p95: 350,
			p99: 600,
			unit: 'ms',
		},
		{
			metric_name: 'GET /api/projects',
			avg_value: 120,
			p50: 95,
			p95: 220,
			p99: 400,
			unit: 'ms',
		},
		{
			metric_name: 'GET /api/materials',
			avg_value: 150,
			p50: 110,
			p95: 280,
			p99: 500,
			unit: 'ms',
		},
		{
			metric_name: 'Database Connection',
			avg_value: 25,
			p50: 20,
			p95: 50,
			p99: 100,
			unit: 'ms',
		},
	];

	return metrics;
}

/**
 * Get error rate statistics
 */
export async function getErrorRates(): Promise<{
	total_requests: number;
	total_errors: number;
	error_rate: number;
	errors_by_status: {
		status: number;
		count: number;
	}[];
}> {
	// In production, this would come from application logs or APM
	// For now, return simulated data

	return {
		total_requests: 125000,
		total_errors: 245,
		error_rate: 0.196, // 0.196%
		errors_by_status: [
			{ status: 400, count: 85 },
			{ status: 401, count: 45 },
			{ status: 403, count: 12 },
			{ status: 404, count: 78 },
			{ status: 500, count: 25 },
		],
	};
}

/**
 * Get database performance metrics
 */
export async function getDatabasePerformance(): Promise<{
	avg_query_time: number;
	slow_queries: number;
	active_connections: number;
	connection_pool_usage: number;
}> {
	const supabase = await createClient();

	try {
		// Test database response time
		const start = Date.now();
		await supabase.from('profiles').select('id').limit(1);
		const queryTime = Date.now() - start;

		// In production, you would query database statistics
		// These are simulated metrics
		return {
			avg_query_time: queryTime,
			slow_queries: 12, // Queries > 1000ms in last hour
			active_connections: 15,
			connection_pool_usage: 45, // percentage
		};
	} catch (error) {
		console.error('Error fetching database performance:', error);
		return {
			avg_query_time: -1,
			slow_queries: 0,
			active_connections: 0,
			connection_pool_usage: 0,
		};
	}
}

/**
 * Get page load performance
 * In a real implementation, this would aggregate from client-side performance API
 */
export async function getPageLoadMetrics(): Promise<{
	page: string;
	avg_load_time: number;
	p50: number;
	p95: number;
}[]> {
	// These would come from client-side performance monitoring
	// Using tools like Google Analytics, Vercel Analytics, or custom tracking

	return [
		{
			page: '/dashboard',
			avg_load_time: 1200,
			p50: 950,
			p95: 2100,
		},
		{
			page: '/dashboard/projects',
			avg_load_time: 800,
			p50: 650,
			p95: 1400,
		},
		{
			page: '/dashboard/time',
			avg_load_time: 1500,
			p50: 1200,
			p95: 2800,
		},
		{
			page: '/dashboard/approvals',
			avg_load_time: 1100,
			p50: 900,
			p95: 2000,
		},
	];
}

/**
 * Get performance summary
 */
export async function getPerformanceSummary(): Promise<{
	system_health: 'good' | 'warning' | 'critical';
	avg_api_response: number;
	error_rate: number;
	db_response_time: number;
	recommendations: string[];
}> {
	const [apiMetrics, errorRates, dbPerf] = await Promise.all([
		getApiPerformanceMetrics(),
		getErrorRates(),
		getDatabasePerformance(),
	]);

	const avgApiResponse = apiMetrics.reduce((sum, m) => sum + m.avg_value, 0) / apiMetrics.length;

	// Determine system health
	let systemHealth: 'good' | 'warning' | 'critical' = 'good';
	const recommendations: string[] = [];

	if (avgApiResponse > 500) {
		systemHealth = 'critical';
		recommendations.push('API response times are critically high. Consider scaling infrastructure.');
	} else if (avgApiResponse > 300) {
		systemHealth = 'warning';
		recommendations.push('API response times are elevated. Monitor closely.');
	}

	if (errorRates.error_rate > 1) {
		systemHealth = 'critical';
		recommendations.push('Error rate is above 1%. Investigate errors immediately.');
	} else if (errorRates.error_rate > 0.5) {
		systemHealth = 'warning';
		recommendations.push('Error rate is elevated. Review error logs.');
	}

	if (dbPerf.avg_query_time > 100) {
		systemHealth = systemHealth === 'critical' ? 'critical' : 'warning';
		recommendations.push('Database queries are slow. Consider query optimization or indexing.');
	}

	if (recommendations.length === 0) {
		recommendations.push('System performance is healthy. No action needed.');
	}

	return {
		system_health: systemHealth,
		avg_api_response: avgApiResponse,
		error_rate: errorRates.error_rate,
		db_response_time: dbPerf.avg_query_time,
		recommendations,
	};
}

