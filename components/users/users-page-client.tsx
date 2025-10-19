'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InviteUserDialog } from '@/components/users/invite-user-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';

interface Member {
	id: string;
	role: string;
	hourly_rate_sek?: number | null;
	profiles: {
		id: string;
		full_name?: string | null;
		email: string;
		phone?: string | null;
	};
}

interface UsersPageClientProps {
	members: Member[];
	canInvite: boolean;
}

export function UsersPageClient({ members, canInvite }: UsersPageClientProps) {
	const router = useRouter();

	const handleRefresh = () => {
		router.refresh();
	};

	const getRoleBadge = (role: string) => {
		const variants = {
			admin: 'default',
			foreman: 'secondary',
			worker: 'outline',
			finance: 'secondary',
		} as const;

		const labels = {
			admin: 'Admin',
			foreman: 'Arbetsledare',
			worker: 'Arbetare',
			finance: 'Ekonomi',
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
				{canInvite && <InviteUserDialog onSuccess={handleRefresh} />}
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
								const profile = member.profiles;
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
											{canInvite && (
												<EditUserDialog
													userId={profile.id}
													currentRole={member.role}
													currentHourlyRate={member.hourly_rate_sek}
													userName={profile.full_name || 'Ingen namn'}
													userEmail={profile.email}
													onSuccess={handleRefresh}
												/>
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
					<CardTitle>Om användarhantering</CardTitle>
					<CardDescription>
						Hantera teammedlemmar och deras behörigheter
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						<div>
							<h3 className='font-medium mb-2'>Roller</h3>
							<ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
								<li><strong>Admin</strong> - Full åtkomst till alla funktioner inklusive användarhantering</li>
								<li><strong>Arbetsledare</strong> - Kan se alla data men inte hantera användare eller organisation</li>
								<li><strong>Ekonomi</strong> - Skrivskyddad åtkomst för fakturering och lönehantering</li>
								<li><strong>Arbetare</strong> - Kan endast se och redigera sina egna data</li>
							</ul>
						</div>
						<div>
							<h3 className='font-medium mb-2'>Funktioner</h3>
							<ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
								<li>Bjud in nya användare via e-post</li>
								<li>Sätt roller och timtaxor</li>
								<li>Redigera användarbehörigheter</li>
								<li>Inaktivera användare</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

