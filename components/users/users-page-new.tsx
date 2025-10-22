'use client';

import { useState } from 'react';
import { Plus, Edit, Info, Mail, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InviteUserDialog } from '@/components/users/invite-user-dialog';
import { EditUserDialog } from '@/components/users/edit-user-dialog';

interface Member {
	id: string;
	role: 'admin' | 'foreman' | 'finance' | 'worker';
	hourly_rate_sek: number | null;
	profiles: {
		id: string;
		full_name: string;
		email: string;
		phone: string | null;
	};
}

interface UsersPageNewProps {
	members: Member[];
	canInvite: boolean;
}

export function UsersPageNew({ members, canInvite }: UsersPageNewProps) {
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [editingUser, setEditingUser] = useState<Member | null>(null);

	const getRoleName = (role: string) => {
		switch (role) {
			case 'admin':
				return 'Admin';
			case 'foreman':
				return 'Arbetsledare';
			case 'finance':
				return 'Ekonomi';
			case 'worker':
				return 'Arbetare';
			default:
				return role;
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-700 border-2 border-red-200';
			case 'foreman':
				return 'bg-blue-100 text-blue-700 border-2 border-blue-200';
			case 'finance':
				return 'bg-green-100 text-green-700 border-2 border-green-200';
			case 'worker':
				return 'bg-gray-100 text-gray-700 border-2 border-gray-200';
			default:
				return 'bg-muted text-muted-foreground border-2 border-border';
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight mb-1'>Användare</h1>
							<p className='text-sm text-muted-foreground'>Hantera teammedlemmar och deras behörigheter</p>
						</div>
						{canInvite && (
							<Button
								onClick={() => setShowInviteDialog(true)}
								className='shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200'
							>
								<Plus className='w-4 h-4 mr-2' />
								<span className='hidden md:inline'>Bjud in användare</span>
								<span className='md:hidden'>Bjud in</span>
							</Button>
						)}
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				<div className='space-y-6'>
					{/* Team Members List */}
					<div>
						<div className='mb-4'>
							<h3 className='text-lg font-semibold mb-1'>Teammedlemmar ({members.length})</h3>
							<p className='text-sm text-muted-foreground'>Alla användare i din organisation</p>
						</div>

						<div className='space-y-3'>
							{members.map((member) => (
								<div
									key={member.id}
									className='bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-200'
								>
									<div className='flex flex-col md:flex-row items-start md:items-center gap-4'>
										{/* Avatar */}
										<Avatar className='w-12 h-12 shrink-0'>
											<AvatarFallback className='bg-primary text-primary-foreground text-lg font-semibold'>
												{getInitials(member.profiles.full_name)}
											</AvatarFallback>
										</Avatar>

										{/* User Info */}
										<div className='flex-1 min-w-0'>
											<h4 className='font-semibold mb-1'>{member.profiles.full_name}</h4>
											<div className='flex flex-col gap-1'>
												<p className='text-sm text-muted-foreground flex items-center gap-1.5'>
													<Mail className='w-3.5 h-3.5' />
													{member.profiles.email}
												</p>
												{member.profiles.phone && (
													<p className='text-sm text-muted-foreground flex items-center gap-1.5'>
														<Phone className='w-3.5 h-3.5' />
														{member.profiles.phone}
													</p>
												)}
											</div>
										</div>

										{/* Role, Rate & Actions */}
										<div className='flex flex-wrap items-center gap-3 w-full md:w-auto'>
											<span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getRoleColor(member.role)}`}>
												{getRoleName(member.role)}
											</span>
											<span className='text-sm font-medium px-3 py-1.5 bg-accent rounded-lg'>
												{member.hourly_rate_sek || 0} kr/tim
											</span>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => setEditingUser(member)}
												className='hover:bg-accent hover:text-accent-foreground'
											>
												<Edit className='w-4 h-4' />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Info Box */}
					<div className='bg-card border-2 border-border rounded-xl p-6'>
						<div className='flex items-start gap-3 mb-6'>
							<div className='p-2 rounded-lg bg-accent shrink-0'>
								<Info className='w-5 h-5 text-primary' />
							</div>
							<div>
								<h3 className='text-lg font-semibold mb-1'>Om användarhantering</h3>
								<p className='text-sm text-muted-foreground'>Hantera teammedlemmar och deras behörigheter</p>
							</div>
						</div>

						<div className='space-y-6'>
							{/* Roles */}
							<div>
								<h4 className='font-semibold mb-3'>Roller</h4>
								<ul className='space-y-2.5 text-sm'>
									<li className='flex items-start gap-2'>
										<span className='text-muted-foreground mt-0.5'>•</span>
										<span className='text-muted-foreground'>
											<span className='font-semibold text-foreground'>Admin</span> - Full åtkomst till alla funktioner
											inklusive användarhantering
										</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='text-muted-foreground mt-0.5'>•</span>
										<span className='text-muted-foreground'>
											<span className='font-semibold text-foreground'>Arbetsledare</span> - Kan godkänna tid och hantera
											projekt men inte användare
										</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='text-muted-foreground mt-0.5'>•</span>
										<span className='text-muted-foreground'>
											<span className='font-semibold text-foreground'>Ekonomi</span> - Åtkomst för fakturering och
											löneunderlag
										</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='text-muted-foreground mt-0.5'>•</span>
										<span className='text-muted-foreground'>
											<span className='font-semibold text-foreground'>Arbetare</span> - Kan endast se och redigera sina
											egna data
										</span>
									</li>
								</ul>
							</div>

							{/* Functions */}
							<div>
								<h4 className='font-semibold mb-3'>Funktioner</h4>
								<ul className='space-y-2.5 text-sm text-muted-foreground'>
									<li className='flex items-start gap-2'>
										<span className='mt-0.5'>•</span>
										<span>Bjud in nya användare via e-post</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='mt-0.5'>•</span>
										<span>Sätt roller och timtaxor</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='mt-0.5'>•</span>
										<span>Redigera användarbehörigheter</span>
									</li>
									<li className='flex items-start gap-2'>
										<span className='mt-0.5'>•</span>
										<span>Inaktivera användare</span>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Dialogs */}
			<InviteUserDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
			{editingUser && (
				<EditUserDialog member={editingUser} open={!!editingUser} onClose={() => setEditingUser(null)} />
			)}
		</div>
	);
}

