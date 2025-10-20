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
	FileEdit,
	BookOpen,
	HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance';

interface NavItem {
	label: string;
	href: string;
	icon: any;
	roles: UserRole[]; // Roles that can see this item
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
		label: 'ÄTA',
		href: '/dashboard/ata',
		icon: FileEdit,
		roles: ['admin', 'foreman', 'worker'],
	},
	{
		label: 'Dagbok',
		href: '/dashboard/diary',
		icon: BookOpen,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Checklistor',
		href: '/dashboard/checklists',
		icon: CheckSquare,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Godkännanden',
		href: '/dashboard/approvals',
		icon: CheckSquare,
		roles: ['admin', 'foreman'], // Only admin and foreman can approve
	},
	{
		label: 'Hjälp',
		href: '/dashboard/help',
		icon: HelpCircle,
		roles: ['admin', 'foreman', 'worker', 'finance'], // Everyone can see help
	},
];

const settingsItems: NavItem[] = [
	{
		label: 'Organisation',
		href: '/dashboard/settings/organization',
		icon: Building2,
		roles: ['admin'], // Only admin can manage organization
	},
	{
		label: 'Användare',
		href: '/dashboard/settings/users',
		icon: Users,
		roles: ['admin'], // Only admin can manage users
	},
	{
		label: 'Inställningar',
		href: '/dashboard/settings',
		icon: Settings,
		roles: ['admin', 'foreman', 'worker', 'finance'], // Everyone can see their own settings/profile
	},
];

interface SidebarProps {
	userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
	const pathname = usePathname();

	// Filter items based on user role
	const visibleNavItems = navItems.filter((item) => item.roles.includes(userRole));
	const visibleSettingsItems = settingsItems.filter((item) => item.roles.includes(userRole));
	const showAdminSection = visibleSettingsItems.length > 0;

	return (
		<aside className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background'>
			<div className='flex flex-col flex-1 min-h-0 pt-5 pb-4'>
				<div className='flex items-center flex-shrink-0 px-6'>
					<h1 className='text-xl font-bold text-primary'>EP Time Tracker</h1>
				</div>

				<nav className='flex-1 px-3 mt-8 space-y-1'>
					{visibleNavItems.map((item) => {
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

					{showAdminSection && (
						<div className='pt-6 mt-6 border-t'>
							<p className='px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
								Administration
							</p>
							{visibleSettingsItems.map((item) => {
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
					)}
				</nav>
			</div>
		</aside>
	);
}

