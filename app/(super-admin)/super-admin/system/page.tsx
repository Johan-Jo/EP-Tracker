import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getSystemStatus } from '@/lib/super-admin/system-status';
import { SystemStatusWidget } from '@/components/super-admin/system/system-status-widget';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Wrench, FileText, Activity } from 'lucide-react';

export const metadata = {
	title: 'Systemkonfiguration | Super Admin',
	description: 'Hantera systemkonfiguration och övervaka systemhälsa',
};

export default async function SystemPage() {
	await requireSuperAdmin();

	const status = await getSystemStatus();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Systemkonfiguration</h1>
					<p className="text-muted-foreground mt-2">
						Hantera systemkonfiguration och övervaka systemhälsa
					</p>
				</div>

				{/* Quick Links */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Link href="/super-admin/system/features">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
								<Flag className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Hantera globala features
								</p>
							</CardContent>
						</Card>
					</Link>

					<Link href="/super-admin/system/maintenance">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Underhållsläge</CardTitle>
								<Wrench className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Aktivera underhållsläge
								</p>
							</CardContent>
						</Card>
					</Link>

					<Link href="/super-admin/logs">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Granskningsloggar</CardTitle>
								<FileText className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Visa admin-åtgärder
								</p>
							</CardContent>
						</Card>
					</Link>

					<Card className="bg-muted/50">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">System Status</CardTitle>
							<Activity className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<p className="text-xs text-muted-foreground">
								Aktuell sida
							</p>
						</CardContent>
					</Card>
				</div>

				{/* System Status */}
				<Suspense fallback={<div>Laddar status...</div>}>
					<SystemStatusWidget initialStatus={status} autoRefresh={true} />
				</Suspense>
			</div>
		</div>
	);
}

