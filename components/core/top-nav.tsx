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
		<header className='sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'>
			<div className='flex items-center justify-between h-16 px-4 md:px-6'>
			{/* Logo */}
			<div className='flex items-center gap-4'>
				<div className='md:hidden'>
					<Image
						src="/images/EP-Flat.png"
						alt="EP Tracker"
						width={120}
						height={40}
						style={{ width: 'auto', height: '32px' }}
						priority
					/>
				</div>
			</div>

				{/* Right side - Sync Status, Notifications & User menu */}
				<div className='flex items-center gap-3'>
					<SyncStatus />
					
					<Button variant='ghost' size='icon'>
						<Bell className='w-5 h-5' />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' className='relative h-8 w-8 rounded-full p-0'>
								<div className="h-8 w-8 rounded-full bg-[#111827] text-white text-sm font-medium flex items-center justify-center">
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

