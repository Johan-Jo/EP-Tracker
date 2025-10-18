'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	FolderKanban,
	Clock,
	Package,
	CheckSquare,
	Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
	{
		label: 'Översikt',
		href: '/dashboard',
		icon: LayoutDashboard,
	},
	{
		label: 'Projekt',
		href: '/dashboard/projects',
		icon: FolderKanban,
	},
	{
		label: 'Tid',
		href: '/dashboard/time',
		icon: Clock,
	},
	{
		label: 'Material',
		href: '/dashboard/materials',
		icon: Package,
	},
	{
		label: 'Godkänn',
		href: '/dashboard/approvals',
		icon: CheckSquare,
	},
];

export function MobileNav() {
	const pathname = usePathname();

	return (
		<nav className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden'>
			<div className='flex items-center justify-around h-16'>
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					const Icon = item.icon;

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								'flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors',
								isActive
									? 'text-primary font-medium'
									: 'text-muted-foreground hover:text-foreground'
							)}
						>
							<Icon className='w-5 h-5' />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}

