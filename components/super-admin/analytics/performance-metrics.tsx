'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Database, Globe, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PerformanceData {
	summary: {
		system_health: 'good' | 'warning' | 'critical';
		avg_api_response: number;
		error_rate: number;
		db_response_time: number;
		recommendations: string[];
	};
	api_metrics: Array<{
		metric_name: string;
		avg_value: number;
		p50: number;
		p95: number;
		p99: number;
		unit: string;
	}>;
	error_rates: {
		total_requests: number;
		total_errors: number;
		error_rate: number;
		errors_by_status: Array<{
			status: number;
			count: number;
		}>;
	};
	database: {
		avg_query_time: number;
		slow_queries: number;
		active_connections: number;
		connection_pool_usage: number;
	};
	page_load: Array<{
		page: string;
		avg_load_time: number;
		p50: number;
		p95: number;
	}>;
}

export function PerformanceMetrics() {
	const [data, setData] = useState<PerformanceData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchPerformance();
		
		// Auto-refresh every 30 seconds
		const interval = setInterval(fetchPerformance, 30000);
		return () => clearInterval(interval);
	}, []);

	async function fetchPerformance() {
		try {
			const response = await fetch('/api/super-admin/analytics/performance');
			if (response.ok) {
				const perfData = await response.json();
				setData(perfData);
			}
		} catch (error) {
			console.error('Error fetching performance metrics:', error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return <div className="text-center py-8">Laddar performance metrics...</div>;
	}

	if (!data) {
		return <div className="text-center py-8">Kunde inte ladda metrics</div>;
	}

	const healthConfig = {
		good: {
			icon: CheckCircle2,
			color: 'text-green-600',
			bgColor: 'bg-green-50',
			text: 'Systemet fungerar optimalt',
		},
		warning: {
			icon: AlertTriangle,
			color: 'text-orange-600',
			bgColor: 'bg-orange-50',
			text: 'Systemet har varningar',
		},
		critical: {
			icon: AlertCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-50',
			text: 'Kritiska problem upptäckta',
		},
	};

	const config = healthConfig[data.summary.system_health];
	const HealthIcon = config.icon;

	return (
		<div className="space-y-6">
			{/* System Health Overview */}
			<Card className={config.bgColor}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HealthIcon className={`w-5 h-5 ${config.color}`} />
						System Performance
					</CardTitle>
					<CardDescription>{config.text}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.summary.recommendations.map((rec, idx) => (
							<div key={idx} className="text-sm">
								• {rec}
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Avg API Response</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${
							data.summary.avg_api_response > 500 ? 'text-red-600' :
							data.summary.avg_api_response > 300 ? 'text-orange-600' :
							'text-green-600'
						}`}>
							{data.summary.avg_api_response.toFixed(0)}ms
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Error Rate</CardTitle>
						<AlertCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${
							data.summary.error_rate > 1 ? 'text-red-600' :
							data.summary.error_rate > 0.5 ? 'text-orange-600' :
							'text-green-600'
						}`}>
							{data.summary.error_rate.toFixed(2)}%
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{data.error_rates.total_errors} / {data.error_rates.total_requests.toLocaleString()} requests
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">DB Response</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className={`text-2xl font-bold ${
							data.summary.db_response_time > 100 ? 'text-orange-600' :
							'text-green-600'
						}`}>
							{data.summary.db_response_time}ms
						</div>
					</CardContent>
				</Card>
			</div>

			{/* API Performance */}
			<Card>
				<CardHeader>
					<CardTitle>API Performance</CardTitle>
					<CardDescription>Response times för API endpoints</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{data.api_metrics.map((metric) => (
							<div key={metric.metric_name} className="flex items-center justify-between p-3 border rounded">
								<div className="flex-1">
									<div className="font-medium text-sm">{metric.metric_name}</div>
									<div className="text-xs text-muted-foreground mt-1">
										Avg: {metric.avg_value}ms · P50: {metric.p50}ms · P95: {metric.p95}ms · P99: {metric.p99}ms
									</div>
								</div>
								<div className={`text-lg font-bold ${
									metric.avg_value > 500 ? 'text-red-600' :
									metric.avg_value > 300 ? 'text-orange-600' :
									'text-green-600'
								}`}>
									{metric.avg_value}ms
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Page Load Performance */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="w-5 h-5" />
						Page Load Times
					</CardTitle>
					<CardDescription>Genomsnittliga laddningstider för sidor</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{data.page_load.map((page) => (
							<div key={page.page} className="flex items-center justify-between p-3 border rounded">
								<div className="flex-1">
									<div className="font-medium text-sm">{page.page}</div>
									<div className="text-xs text-muted-foreground mt-1">
										P50: {page.p50}ms · P95: {page.p95}ms
									</div>
								</div>
								<div className={`text-lg font-bold ${
									page.avg_load_time > 2000 ? 'text-red-600' :
									page.avg_load_time > 1500 ? 'text-orange-600' :
									'text-green-600'
								}`}>
									{page.avg_load_time}ms
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Database Performance */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="w-5 h-5" />
						Database Performance
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<div className="text-sm text-muted-foreground">Slow Queries</div>
							<div className="text-2xl font-bold">{data.database.slow_queries}</div>
							<div className="text-xs text-muted-foreground">Queries &gt; 1000ms</div>
						</div>
						<div>
							<div className="text-sm text-muted-foreground">Active Connections</div>
							<div className="text-2xl font-bold">{data.database.active_connections}</div>
							<div className="text-xs text-muted-foreground">Pool usage: {data.database.connection_pool_usage}%</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Error Breakdown */}
			<Card>
				<CardHeader>
					<CardTitle>Error Breakdown</CardTitle>
					<CardDescription>Errors per HTTP status code</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.error_rates.errors_by_status.map((error) => (
							<div key={error.status} className="flex items-center justify-between">
								<span className="text-sm">HTTP {error.status}</span>
								<span className="text-sm font-medium">{error.count}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

