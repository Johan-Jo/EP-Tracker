'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, FolderKanban, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsOverview {
	total_users: number;
	total_organizations: number;
	total_projects: number;
	dau: number;
	wau: number;
	mau: number;
	retention_rate: number;
}

export function AnalyticsOverview() {
	const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchOverview();
	}, []);

	async function fetchOverview() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/analytics/overview');
			if (response.ok) {
				const data = await response.json();
				setOverview(data);
			}
		} catch (error) {
			console.error('Error fetching analytics overview:', error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return <div>Laddar översikt...</div>;
	}

	if (!overview) {
		return <div>Kunde inte ladda analytics</div>;
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Totalt Användare</CardTitle>
					<Users className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{overview.total_users}</div>
					<p className="text-xs text-muted-foreground mt-1">
						MAU: {overview.mau} ({((overview.mau / overview.total_users) * 100).toFixed(1)}%)
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Organisationer</CardTitle>
					<Building2 className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{overview.total_organizations}</div>
					<p className="text-xs text-muted-foreground mt-1">
						Aktiva organisationer
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Projekt</CardTitle>
					<FolderKanban className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{overview.total_projects}</div>
					<p className="text-xs text-muted-foreground mt-1">
						Genomsnitt: {(overview.total_projects / overview.total_organizations).toFixed(1)} per org
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Retention</CardTitle>
					{overview.retention_rate >= 80 ? (
						<TrendingUp className="h-4 w-4 text-green-600" />
					) : (
						<TrendingDown className="h-4 w-4 text-red-600" />
					)}
				</CardHeader>
				<CardContent>
					<div className={`text-2xl font-bold ${
						overview.retention_rate >= 80 ? 'text-green-600' : 'text-red-600'
					}`}>
						{overview.retention_rate.toFixed(1)}%
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Månadsvis retention
					</p>
				</CardContent>
			</Card>

			{/* Engagement Metrics */}
			<Card className="md:col-span-2">
				<CardHeader>
					<CardTitle className="text-sm font-medium">Engagement</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<div className="text-xs text-muted-foreground">DAU</div>
							<div className="text-2xl font-bold">{overview.dau}</div>
						</div>
						<div>
							<div className="text-xs text-muted-foreground">WAU</div>
							<div className="text-2xl font-bold">{overview.wau}</div>
						</div>
						<div>
							<div className="text-xs text-muted-foreground">MAU</div>
							<div className="text-2xl font-bold">{overview.mau}</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

