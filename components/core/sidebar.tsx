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
		label: 'ATA',
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
		label: 'Checklista',
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
		<aside className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[#E5E7EB] bg-white dark:border-gray-800 dark:bg-gray-950'>
			<div className='flex flex-col flex-1 min-h-0'>
				{/* Header */}
				<div className="px-5 pt-6 pb-4">
					<div className="flex flex-col">
						<span className="text-lg font-semibold text-gray-900">EP Tracker</span>
						<span className="text-sm text-gray-500">Tidsrapportering</span>
					</div>
				</div>

				{/* Separator line */}
				<div className="mx-5 border-t border-gray-200" />

				<nav className='flex-1 px-4 py-4 space-y-1 overflow-y-auto'>
					{visibleNavItems.map((item) => {
						const isActive = pathname === item.href;
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
									isActive
										? 'bg-orange-50 text-orange-600 font-medium'
										: 'text-gray-700 hover:bg-gray-50'
								)}
							>
								<Icon
									className={cn(
										'flex-shrink-0 h-5 w-5',
										isActive ? 'text-orange-600' : 'text-gray-400'
									)}
								/>
								{item.label}
							</Link>
						);
					})}

					{showAdminSection && (
						<div className='pt-6 mt-6 border-t border-gray-200'>
							<p className='px-3 pt-4 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide'>
								ADMINISTRATION
							</p>
							{visibleSettingsItems.map((item) => {
								const isActive = pathname === item.href;
								const Icon = item.icon;

								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
											isActive
												? 'bg-orange-50 text-orange-600 font-medium'
												: 'text-gray-700 hover:bg-gray-50'
										)}
									>
										<Icon
											className={cn(
												'flex-shrink-0 h-5 w-5',
												isActive ? 'text-orange-600' : 'text-gray-400'
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
