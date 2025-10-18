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
	Building2,
	Users,
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
		label: 'Godkännanden',
		href: '/dashboard/approvals',
		icon: CheckSquare,
	},
];

const settingsItems = [
	{
		label: 'Organisation',
		href: '/dashboard/settings/organization',
		icon: Building2,
	},
	{
		label: 'Användare',
		href: '/dashboard/settings/users',
		icon: Users,
	},
	{
		label: 'Inställningar',
		href: '/dashboard/settings',
		icon: Settings,
	},
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background'>
			<div className='flex flex-col flex-1 min-h-0 pt-5 pb-4'>
				<div className='flex items-center flex-shrink-0 px-6'>
					<h1 className='text-xl font-bold text-primary'>EP Time Tracker</h1>
				</div>

				<nav className='flex-1 px-3 mt-8 space-y-1'>
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
									isActive
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
								)}
							>
								<Icon
									className={cn(
										'mr-3 flex-shrink-0 h-5 w-5',
										isActive ? '' : 'text-muted-foreground group-hover:text-accent-foreground'
									)}
								/>
								{item.label}
							</Link>
						);
					})}

					<div className='pt-6 mt-6 border-t'>
						<p className='px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
							Administration
						</p>
						{settingsItems.map((item) => {
							const isActive = pathname === item.href;
							const Icon = item.icon;

							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
										isActive
											? 'bg-primary text-primary-foreground'
											: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
									)}
								>
									<Icon
										className={cn(
											'mr-3 flex-shrink-0 h-5 w-5',
											isActive
												? ''
												: 'text-muted-foreground group-hover:text-accent-foreground'
										)}
									/>
									{item.label}
								</Link>
							);
						})}
					</div>
				</nav>
			</div>
		</aside>
	);
}

