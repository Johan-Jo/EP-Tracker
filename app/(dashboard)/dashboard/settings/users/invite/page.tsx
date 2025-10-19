import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InviteUserForm } from '@/components/users/invite-user-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function InviteUserPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard/settings/users');
	}

	return (
		<div className="container mx-auto p-6 max-w-4xl">
			<div className="mb-6">
				<Link href="/dashboard/settings/users">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Tillbaka till användare
					</Button>
				</Link>
			</div>

			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">Bjud in ny användare</h1>
				<p className="text-muted-foreground mt-2">
					Skicka en inbjudan via e-post till en ny teammedlem
				</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="p-2 bg-primary/10 rounded-lg">
								<Mail className="w-5 h-5 text-primary" />
							</div>
							<div>
								<CardTitle>Användarinformation</CardTitle>
								<CardDescription>
									Fyll i uppgifterna för den nya användaren
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<InviteUserForm orgId={membership.org_id} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Om roller</CardTitle>
						<CardDescription>
							Välj rätt roll baserat på användarens ansvarsområden
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h4 className="font-semibold text-sm mb-1">Admin</h4>
							<p className="text-sm text-muted-foreground">
								Full åtkomst till alla funktioner inklusive användarhantering och organisationsinställningar
							</p>
						</div>
						<div>
							<h4 className="font-semibold text-sm mb-1">Arbetsledare</h4>
							<p className="text-sm text-muted-foreground">
								Kan se alla data och hantera crew, men kan inte bjuda in användare eller ändra organisationsinställningar
							</p>
						</div>
						<div>
							<h4 className="font-semibold text-sm mb-1">Ekonomi</h4>
							<p className="text-sm text-muted-foreground">
								Skrivskyddad åtkomst för fakturering och lönehantering. Kan se alla data men inte skapa eller redigera poster
							</p>
						</div>
						<div>
							<h4 className="font-semibold text-sm mb-1">Arbetare</h4>
							<p className="text-sm text-muted-foreground">
								Kan endast se och redigera sina egna tidrapporter, material, kostnader och miltal
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

