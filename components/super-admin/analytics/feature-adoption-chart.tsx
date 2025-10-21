'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { FeatureAdoption } from '@/lib/super-admin/analytics-types';

export function FeatureAdoptionChart() {
	const [features, setFeatures] = useState<FeatureAdoption[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchFeatures();
	}, []);

	async function fetchFeatures() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/analytics/features');
			if (response.ok) {
				const data = await response.json();
				setFeatures(data.features);
			}
		} catch (error) {
			console.error('Error fetching feature adoption:', error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Feature Adoption</CardTitle>
				</CardHeader>
				<CardContent>
					<div>Laddar...</div>
				</CardContent>
			</Card>
		);
	}

	const maxAdoption = Math.max(...features.map(f => f.adoption_rate), 1);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Feature Adoption</CardTitle>
				<CardDescription>
					Vilka features används mest
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{features.map((feature) => (
						<div key={feature.feature_name}>
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-medium">{feature.feature_name}</span>
								<span className="text-sm text-muted-foreground">
									{feature.active_users} / {feature.total_users} ({feature.adoption_rate.toFixed(1)}%)
								</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-blue-600 h-2 rounded-full transition-all"
									style={{ width: `${(feature.adoption_rate / maxAdoption) * 100}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

