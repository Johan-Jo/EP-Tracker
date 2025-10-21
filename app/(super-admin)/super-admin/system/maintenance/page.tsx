import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getMaintenanceStatus } from '@/lib/super-admin/maintenance';
import { MaintenanceModeToggle } from '@/components/super-admin/system/maintenance-mode-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
	title: 'Underhållsläge | Super Admin',
	description: 'Hantera systemets underhållsläge',
};

export default async function MaintenancePage() {
	await requireSuperAdmin();

	const status = await getMaintenanceStatus();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Underhållsläge</h1>
					<p className="text-muted-foreground mt-2">
						Aktivera underhållsläge för att stänga av systemet för vanliga användare
					</p>
				</div>

				<Suspense fallback={<div>Laddar...</div>}>
					<MaintenanceModeToggle initialStatus={status} />
				</Suspense>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5" />
							Viktigt att veta
						</CardTitle>
						<CardDescription>
							Information om underhållsläge
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div>
							<strong>När underhållsläge är aktivt:</strong>
							<ul className="list-disc list-inside ml-4 mt-1 space-y-1">
								<li>Vanliga användare kan inte logga in</li>
								<li>Inloggade användare blir utloggade (nästa gång de laddar om sidan)</li>
								<li>Super admins kan fortfarande logga in</li>
								<li>Ett anpassat meddelande visas på inloggningssidan</li>
							</ul>
						</div>
						<div>
							<strong>Använd underhållsläge för:</strong>
							<ul className="list-disc list-inside ml-4 mt-1 space-y-1">
								<li>Databasmigrationer</li>
								<li>Serveruppdateringar</li>
								<li>Kritiska buggfixar</li>
								<li>Systemuppgraderingar</li>
							</ul>
						</div>
						<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<strong className="text-yellow-800">⚠️ Rekommendation:</strong>
							<p className="text-yellow-700 mt-1">
								Informera alltid användare i förväg om planerat underhåll.
								Använd email-system för att skicka notifikationer.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

