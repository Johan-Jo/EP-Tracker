'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, Activity, Database, Users, Building2, FolderKanban, HardDrive } from 'lucide-react';
import type { SystemStatus } from '@/lib/super-admin/system-status';

interface SystemStatusWidgetProps {
	initialStatus: SystemStatus;
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export function SystemStatusWidget({ initialStatus, autoRefresh = false, refreshInterval = 30000 }: SystemStatusWidgetProps) {
	const [status, setStatus] = useState(initialStatus);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(async () => {
			await fetchStatus();
		}, refreshInterval);

		return () => clearInterval(interval);
	}, [autoRefresh, refreshInterval]);

	async function fetchStatus() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/system/status');
			if (response.ok) {
				const data = await response.json();
				setStatus(data);
			}
		} catch (error) {
			console.error('Error fetching system status:', error);
		} finally {
			setLoading(false);
		}
	}

	const statusConfig = {
		healthy: {
			icon: CheckCircle2,
			color: 'text-green-600',
			bgColor: 'bg-green-50',
			text: 'System fungerar normalt',
		},
		warning: {
			icon: AlertTriangle,
			color: 'text-orange-600',
			bgColor: 'bg-orange-50',
			text: 'Systemet har varningar',
		},
		error: {
			icon: XCircle,
			color: 'text-red-600',
			bgColor: 'bg-red-50',
			text: 'Systemet har problem',
		},
	};

	const config = statusConfig[status.status];
	const StatusIcon = config.icon;

	return (
		<div className="space-y-6">
			{/* Overall Status */}
			<Card className={config.bgColor}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<StatusIcon className={`w-5 h-5 ${config.color}`} />
						System Status
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className={`text-lg font-medium ${config.color}`}>
							{config.text}
						</div>
						<div className="text-sm text-muted-foreground">
							Senast uppdaterad: {new Date(status.timestamp).toLocaleString('sv-SE')}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Database Status */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="w-5 h-5" />
						Databas
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Status</span>
							<span className={`text-sm font-medium ${
								status.database.status === 'connected' ? 'text-green-600' : 'text-red-600'
							}`}>
								{status.database.status === 'connected' ? 'Ansluten' : 'Frånkopplad'}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Svarstid</span>
							<span className="text-sm font-medium">
								{status.database.response_time_ms}ms
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Metrics Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Användare</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{status.metrics.total_users}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Organisationer</CardTitle>
						<Building2 className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{status.metrics.total_organizations}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Projekt</CardTitle>
						<FolderKanban className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{status.metrics.total_projects}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Aktiva Prenumerationer</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{status.metrics.active_subscriptions}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Lagring</CardTitle>
						<HardDrive className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{status.metrics.total_storage_gb.toFixed(2)} GB
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Uptime</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

