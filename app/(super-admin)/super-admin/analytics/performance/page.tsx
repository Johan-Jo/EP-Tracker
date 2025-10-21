import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { PerformanceMetrics } from '@/components/super-admin/analytics/performance-metrics';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
	title: 'Performance Metrics | Analytics | Super Admin',
	description: 'System performance och API response times',
};

export default async function PerformancePage() {
	await requireSuperAdmin();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Link href="/super-admin/analytics">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Tillbaka till Analytics
						</Button>
					</Link>
				</div>

				<div>
					<h1 className="text-3xl font-bold tracking-tight">Performance Metrics</h1>
					<p className="text-muted-foreground mt-2">
						System performance, API response times, och error rates
					</p>
				</div>

				<Suspense fallback={<div>Laddar performance metrics...</div>}>
					<PerformanceMetrics />
				</Suspense>
			</div>
		</div>
	);
}

