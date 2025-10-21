import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlobalSearch } from '@/components/super-admin/support/global-search';
import { UserCog, Users, Search, FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
	title: 'Support Tools | Super Admin',
	description: 'Customer support tools and user management',
};

export default async function SupportPage() {
	await requireSuperAdmin();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Support Tools</h1>
					<p className="text-muted-foreground mt-2">
						Customer support tools och användarhantering
					</p>
				</div>

				{/* Global Search */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Search className="w-5 h-5" />
							Global Sök
						</CardTitle>
						<CardDescription>
							Sök efter användare eller organisationer
						</CardDescription>
					</CardHeader>
					<CardContent>
						<GlobalSearch />
					</CardContent>
				</Card>

				{/* Quick Actions */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Link href="/super-admin/users">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div>
									<CardTitle className="flex items-center gap-2 text-lg">
										<Users className="w-5 h-5" />
										Alla Användare
									</CardTitle>
									<CardDescription className="mt-2">
										Visa och hantera alla användare
									</CardDescription>
								</div>
							</CardHeader>
						</Card>
					</Link>

					<Link href="/super-admin/organizations">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div>
									<CardTitle className="flex items-center gap-2 text-lg">
										<UserCog className="w-5 h-5" />
										Organisationer
									</CardTitle>
									<CardDescription className="mt-2">
										Hantera organisationer och impersonera användare
									</CardDescription>
								</div>
							</CardHeader>
						</Card>
					</Link>

					<Link href="/super-admin/logs">
						<Card className="hover:bg-muted/50 transition-colors cursor-pointer">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div>
									<CardTitle className="flex items-center gap-2 text-lg">
										<FileText className="w-5 h-5" />
										Audit Logs
									</CardTitle>
									<CardDescription className="mt-2">
										Granska support-åtgärder
									</CardDescription>
								</div>
							</CardHeader>
						</Card>
					</Link>
				</div>

				{/* Support Actions Guide */}
				<Card>
					<CardHeader>
						<CardTitle>Support Actions</CardTitle>
						<CardDescription>
							Vanliga support-åtgärder tillgängliga från organization detail sidor
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							<div>• <strong>Impersonera användare:</strong> Logga in som användare för att se deras vy</div>
							<div>• <strong>Suspendera/Återaktivera:</strong> Hantera organization status</div>
							<div>• <strong>Uppdatera prenumeration:</strong> Ändra plan eller betalningsstatus</div>
							<div>• <strong>Visa användare:</strong> Se alla användare i en organization</div>
							<div>• <strong>Audit logs:</strong> Granska alla åtgärder på organisationen</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

