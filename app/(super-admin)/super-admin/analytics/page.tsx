import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { AnalyticsOverview } from '@/components/super-admin/analytics/analytics-overview';
import { FeatureAdoptionChart } from '@/components/super-admin/analytics/feature-adoption-chart';
import { ContentGrowthChart } from '@/components/super-admin/analytics/content-growth-chart';
import { ChurnRiskTable } from '@/components/super-admin/analytics/churn-risk-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
	title: 'Analytics | Super Admin',
	description: 'Usage analytics och metriker',
};

export default async function AnalyticsPage() {
	await requireSuperAdmin();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
					<p className="text-muted-foreground mt-2">
						Usage analytics och metriker för hela plattformen
					</p>
				</div>

				{/* Overview Metrics */}
				<Suspense fallback={<div>Laddar översikt...</div>}>
					<AnalyticsOverview />
				</Suspense>

				{/* Charts Grid */}
				<div className="grid gap-6 md:grid-cols-2">
					{/* Feature Adoption */}
					<Suspense fallback={<div>Laddar feature adoption...</div>}>
						<FeatureAdoptionChart />
					</Suspense>

					{/* Content Growth */}
					<Suspense fallback={<div>Laddar innehållstillväxt...</div>}>
						<ContentGrowthChart />
					</Suspense>
				</div>

				{/* Churn Risk */}
				<Suspense fallback={<div>Laddar churn risk...</div>}>
					<ChurnRiskTable />
				</Suspense>

				{/* Performance Metrics Link */}
				<Link href="/super-admin/analytics/performance">
					<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Activity className="w-5 h-5" />
									Performance Metrics
								</CardTitle>
								<CardDescription className="mt-2">
									Visa detaljerade performance metrics, API response times, och error rates
								</CardDescription>
							</div>
						</CardHeader>
					</Card>
				</Link>
			</div>
		</div>
	);
}

