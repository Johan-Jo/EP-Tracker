'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ContentMetrics } from '@/lib/super-admin/analytics-types';

const entityLabels: Record<string, string> = {
	time_entries: 'Tidrapporter',
	materials: 'Material',
	expenses: 'Utlägg',
	projects: 'Projekt',
	ata: 'ÄTA',
	diary: 'Dagbok',
};

export function ContentGrowthChart() {
	const [metrics, setMetrics] = useState<ContentMetrics[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchMetrics();
	}, []);

	async function fetchMetrics() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/analytics/content');
			if (response.ok) {
				const data = await response.json();
				setMetrics(data.metrics);
			}
		} catch (error) {
			console.error('Error fetching content metrics:', error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Innehållstillväxt</CardTitle>
				</CardHeader>
				<CardContent>
					<div>Laddar...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Innehållstillväxt</CardTitle>
				<CardDescription>
					Tillväxt av olika innehållstyper denna månad
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{metrics.map((metric) => (
						<div key={metric.entity_type} className="flex items-center justify-between p-3 border rounded-lg">
							<div className="flex-1">
								<div className="font-medium">{entityLabels[metric.entity_type] || metric.entity_type}</div>
								<div className="text-sm text-muted-foreground">
									{metric.count_this_month} denna månad · {metric.total_count} totalt
								</div>
							</div>
							<div className="flex items-center gap-2">
								{metric.growth_rate > 0 ? (
									<TrendingUp className="w-4 h-4 text-green-600" />
								) : metric.growth_rate < 0 ? (
									<TrendingDown className="w-4 h-4 text-red-600" />
								) : null}
								<span className={`text-sm font-medium ${
									metric.growth_rate > 0 ? 'text-green-600' :
									metric.growth_rate < 0 ? 'text-red-600' :
									'text-gray-600'
								}`}>
									{metric.growth_rate > 0 ? '+' : ''}{metric.growth_rate.toFixed(1)}%
								</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

