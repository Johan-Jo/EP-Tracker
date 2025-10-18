import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Mail } from 'lucide-react';
import Link from 'next/link';

export default async function UsersSettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization membership
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership || !['admin', 'foreman'].includes(membership.role)) {
		return (
			<div className='p-4 md:p-8'>
				<Card>
					<CardHeader>
						<CardTitle>Åtkomst nekad</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Du behöver vara administratör eller arbetsledare för att hantera användare.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Get all members in organization with their profiles
	const { data: members } = await supabase
		.from('memberships')
		.select(
			`
			*,
			profiles (*)
		`
		)
		.eq('org_id', membership.org_id)
		.eq('is_active', true)
		.order('created_at', { ascending: false });

	const canInvite = membership.role === 'admin';

	const getRoleBadge = (role: string) => {
		const variants = {
			admin: 'default',
			foreman: 'secondary',
			worker: 'outline',
		} as const;

		const labels = {
			admin: 'Admin',
			foreman: 'Arbetsledare',
			worker: 'Arbetare',
		};

		return (
			<Badge variant={variants[role as keyof typeof variants]}>
				{labels[role as keyof typeof labels] || role}
			</Badge>
		);
	};

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Användare</h1>
					<p className='text-muted-foreground mt-2'>
						Hantera teammedlemmar och deras behörigheter
					</p>
				</div>
				{canInvite && (
					<Button disabled variant='outline'>
						<Mail className='w-4 h-4 mr-2' />
						Bjud in användare (Kommer snart)
					</Button>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Teammedlemmar ({members?.length || 0})</CardTitle>
					<CardDescription>
						Alla användare i din organisation
					</CardDescription>
				</CardHeader>
				<CardContent>
					{members && members.length > 0 ? (
						<div className='space-y-4'>
							{members.map((member) => {
								const profile = member.profiles as any;
								const initials = profile.full_name
									? profile.full_name
											.split(' ')
											.map((n: string) => n[0])
											.join('')
											.toUpperCase()
											.slice(0, 2)
									: profile.email.charAt(0).toUpperCase();

								return (
									<div
										key={member.id}
										className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors'
									>
										<div className='flex items-center gap-4'>
											<Avatar>
												<AvatarFallback className='bg-primary text-primary-foreground'>
													{initials}
												</AvatarFallback>
											</Avatar>
											<div>
												<p className='font-medium'>
													{profile.full_name || 'Ingen namn'}
												</p>
												<p className='text-sm text-muted-foreground'>{profile.email}</p>
												{profile.phone && (
													<p className='text-sm text-muted-foreground'>{profile.phone}</p>
												)}
											</div>
										</div>

										<div className='flex items-center gap-4'>
											{getRoleBadge(member.role)}
											{member.hourly_rate_sek && (
												<div className='text-right'>
													<p className='text-sm font-medium'>
														{member.hourly_rate_sek} kr/tim
													</p>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<p className='text-center text-muted-foreground py-8'>
							Inga användare hittades
						</p>
					)}
				</CardContent>
			</Card>

			<Card className='border-muted-foreground/20'>
				<CardHeader>
					<CardTitle>Bjud in nya användare</CardTitle>
					<CardDescription>
						Funktionalitet för att bjuda in nya teammedlemmar via e-post kommer i en senare
						version
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						<p className='text-sm text-muted-foreground'>
							Kommande funktioner:
						</p>
						<ul className='list-disc list-inside space-y-2 text-sm text-muted-foreground'>
							<li>Bjud in användare via e-post</li>
							<li>Sätt roller och timtaxor</li>
							<li>Hantera användarbehörigheter</li>
							<li>Inaktivera användare</li>
							<li>Visa användaraktivitet</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

