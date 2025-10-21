'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EditUserDialog } from '@/components/users/edit-user-dialog';
import { Mail, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
	const searchParams = useSearchParams();
	const [showSuccess, setShowSuccess] = useState(false);

	useEffect(() => {
		if (searchParams.get('invited') === 'true') {
			setShowSuccess(true);
			// Remove the query param from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('invited');
			window.history.replaceState({}, '', url.toString());
		}
	}, [searchParams]);

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
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			{showSuccess && (
				<div className='flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800'>
					<CheckCircle2 className='w-5 h-5 text-green-600 flex-shrink-0 dark:text-green-400' />
					<p className='text-sm text-green-800 flex-1 dark:text-green-300'>
						Inbjudan har skickats! Användaren kommer att få ett e-postmeddelande med instruktioner.
					</p>
					<button
						onClick={() => setShowSuccess(false)}
						className='text-green-600 hover:text-green-800'
					>
						<X className='w-4 h-4' />
					</button>
				</div>
			)}

			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Användare</h1>
					<p className='text-gray-600 dark:text-gray-400 mt-2'>
						Hantera teammedlemmar och deras behörigheter
					</p>
				</div>
				{canInvite && (
					<Link href='/dashboard/settings/users/invite'>
						<Button className='bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'>
							<Mail className='w-4 h-4 mr-2' />
							Bjud in användare
						</Button>
					</Link>
				)}
			</div>

			<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
				<CardHeader>
					<CardTitle className='text-gray-900 dark:text-white'>Teammedlemmar ({members?.length || 0})</CardTitle>
					<CardDescription className='text-gray-600 dark:text-gray-400'>
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
										className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-900'
									>
										<div className='flex items-center gap-4'>
											<Avatar>
												<AvatarFallback className='bg-orange-600 text-white dark:bg-orange-500'>
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

