'use client';

import { Bell, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

interface TopNavProps {
	userEmail?: string;
	userName?: string;
}

export function TopNav({ userEmail, userName }: TopNavProps) {
	const initials = userName
		? userName
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: userEmail?.charAt(0).toUpperCase() || 'U';

	return (
		<header className='sticky top-0 z-40 border-b bg-background'>
			<div className='flex items-center justify-between h-16 px-4 md:px-6'>
				{/* Mobile menu button + Logo */}
				<div className='flex items-center gap-4'>
					<Button variant='ghost' size='icon' className='md:hidden'>
						<Menu className='w-5 h-5' />
					</Button>
					<h1 className='text-lg font-bold md:hidden'>EP Tracker</h1>
				</div>

				{/* Right side - Notifications & User menu */}
				<div className='flex items-center gap-2'>
					<Button variant='ghost' size='icon'>
						<Bell className='w-5 h-5' />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' className='relative h-9 w-9 rounded-full'>
								<Avatar className='h-9 w-9'>
									<AvatarFallback className='bg-primary text-primary-foreground'>
										{initials}
									</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuLabel>
								<div className='flex flex-col space-y-1'>
									<p className='text-sm font-medium leading-none'>{userName || 'Användare'}</p>
									<p className='text-xs leading-none text-muted-foreground'>{userEmail}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<Link href='/dashboard/settings'>Inställningar</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href='/dashboard/settings/profile'>Profil</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<form action='/api/auth/signout' method='POST'>
									<button type='submit' className='w-full text-left'>
										Logga ut
									</button>
								</form>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}

