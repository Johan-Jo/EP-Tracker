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
		<aside className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'>
			<div className='flex flex-col flex-1 min-h-0'>
				{/* Header */}
				<div className='border-b border-gray-200 px-6 py-5 dark:border-gray-800'>
					<h1 className='text-xl font-bold text-gray-900 dark:text-white'>EP Tracker</h1>
					<p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
						Tidrapportering
					</p>
				</div>

				<nav className='flex-1 px-2 py-4 space-y-1 overflow-y-auto'>
					{visibleNavItems.map((item) => {
						const isActive = pathname === item.href;
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
									isActive
										? 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100'
										: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
								)}
							>
								<Icon
									className={cn(
										'flex-shrink-0 h-5 w-5',
										isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600'
									)}
								/>
								{item.label}
							</Link>
						);
					})}

					{showAdminSection && (
						<div className='pt-6 mt-6 border-t border-gray-200 dark:border-gray-800'>
							<p className='px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
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
											'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
											isActive
												? 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100'
												: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
										)}
									>
										<Icon
											className={cn(
												'flex-shrink-0 h-5 w-5',
												isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600'
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

