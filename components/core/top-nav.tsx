'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SyncStatus } from '@/components/core/sync-status';
import DarkModeToggle from './dark-mode-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TopNavProps {
	userEmail?: string;
	userName?: string;
}

export function TopNav({ userEmail, userName }: TopNavProps) {
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const initials = userName
		? userName
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: userEmail?.charAt(0).toUpperCase() || 'U';

	const handleSignOut = async () => {
		if (isLoggingOut) return;
		
		setIsLoggingOut(true);
		try {
			const res = await fetch('/api/auth/signout', {
				method: 'POST',
			});

			if (res.ok) {
				router.push('/sign-in');
				router.refresh();
			} else {
				console.error('Sign out failed');
				setIsLoggingOut(false);
			}
		} catch (error) {
			console.error('Sign out error:', error);
			setIsLoggingOut(false);
		}
	};

	return (
		<header className='relative sticky top-0 z-40 border-b border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] md:pl-64 md:before:absolute md:before:left-[-2px] md:before:top-0 md:before:h-full md:before:w-[calc(16rem+2px)] md:before:bg-[var(--color-sidebar)] md:before:content-[""] md:before:pointer-events-none md:before:z-10'>
			<div className='relative z-10 mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between px-4 md:px-6 md:pl-6'>
		{/* Logo */}
		<div className='flex items-center gap-4'>
			<Link href='/dashboard' className='md:hidden'>
				<Image
					src="/images/EP-Flat.png"
					alt="EP Tracker"
					width={120}
					height={40}
					style={{ width: 'auto', height: '32px' }}
					priority
				/>
			</Link>
		</div>

				{/* Right side - Sync Status, Notifications & User menu */}
				<div className='flex items-center gap-3 text-[var(--color-sidebar-foreground)]'>
					<SyncStatus />
					<DarkModeToggle />

					<Button variant='ghost' size='icon' className='text-[var(--color-sidebar-foreground)] hover:bg-white/10'>
						<Bell className='h-5 w-5' />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' className='relative h-8 w-8 rounded-full p-0 text-[var(--color-sidebar-foreground)] hover:bg-white/10'>
								<div className='flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-sm font-medium text-white dark:bg-orange-500'>
									{initials}
								</div>
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
						<DropdownMenuItem
							onClick={handleSignOut}
							disabled={isLoggingOut}
							className='cursor-pointer'
						>
							{isLoggingOut ? 'Loggar ut...' : 'Logga ut'}
						</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}

