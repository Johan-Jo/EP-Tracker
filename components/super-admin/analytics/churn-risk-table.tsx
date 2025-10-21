'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import type { ChurnRisk } from '@/lib/super-admin/analytics-types';
import Link from 'next/link';

export function ChurnRiskTable() {
	const [risks, setRisks] = useState<ChurnRisk[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchRisks();
	}, []);

	async function fetchRisks() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/analytics/churn-risk');
			if (response.ok) {
				const data = await response.json();
				setRisks(data.risks.slice(0, 10)); // Top 10 at-risk orgs
			}
		} catch (error) {
			console.error('Error fetching churn risk:', error);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Churn Risk</CardTitle>
				</CardHeader>
				<CardContent>
					<div>Laddar...</div>
				</CardContent>
			</Card>
		);
	}

	if (risks.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-green-600" />
						Churn Risk
					</CardTitle>
					<CardDescription>
						Inga organisationer i riskzonen
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center text-green-600 py-4">
						Alla organisationer är aktiva! 🎉
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<AlertTriangle className="w-5 h-5 text-orange-600" />
					Churn Risk
				</CardTitle>
				<CardDescription>
					Organisationer med risk att sluta använda systemet
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{risks.map((risk) => (
						<Link
							key={risk.org_id}
							href={`/super-admin/organizations/${risk.org_id}`}
							className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="font-medium">{risk.org_name}</div>
									<div className="text-sm text-muted-foreground mt-1">
										{risk.risk_factors.join(' · ')}
									</div>
									<div className="text-xs text-muted-foreground mt-1">
										Senast aktiv: {risk.last_active} ({risk.days_inactive} dagar sedan)
									</div>
								</div>
								<div className="ml-4">
									<div className={`text-lg font-bold ${
										risk.risk_score >= 70 ? 'text-red-600' :
										risk.risk_score >= 40 ? 'text-orange-600' :
										'text-yellow-600'
									}`}>
										{risk.risk_score}
									</div>
									<div className="text-xs text-muted-foreground">risk</div>
								</div>
							</div>
						</Link>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

