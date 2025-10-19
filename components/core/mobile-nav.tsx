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

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance';

interface NavItem {
	label: string;
	href: string;
	icon: any;
	roles: UserRole[];
}

const navItems: NavItem[] = [
	{
		label: 'Översikt',
		href: '/dashboard',
		icon: LayoutDashboard,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
	{
		label: 'Projekt',
		href: '/dashboard/projects',
		icon: FolderKanban,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
	{
		label: 'Tid',
		href: '/dashboard/time',
		icon: Clock,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
	{
		label: 'Material',
		href: '/dashboard/materials',
		icon: Package,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
	{
		label: 'Godkänn',
		href: '/dashboard/approvals',
		icon: CheckSquare,
		roles: ['admin', 'foreman'], // Only admin and foreman can approve
	},
	{
		label: 'Inställn.',
		href: '/dashboard/settings',
		icon: Settings,
		roles: ['admin', 'foreman', 'worker', 'finance'], // Everyone can see their own settings
	},
];

interface MobileNavProps {
	userRole: UserRole;
}

export function MobileNav({ userRole }: MobileNavProps) {
	const pathname = usePathname();

	// Filter items based on user role
	const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole));

	return (
		<nav className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden'>
			<div className='flex items-center justify-around h-16'>
				{visibleNavItems.map((item) => {
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

