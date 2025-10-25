'use client';

import Link from 'next/link';
import Image from 'next/image';
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
	Plus,
	Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance';

interface NavItem {
	label: string;
	href: string;
	icon: any;
	roles: UserRole[]; // Roles that can see this item
	subItems?: NavItem[]; // Optional sub-navigation items
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
		subItems: [
			{
				label: 'Skapa nytt',
				href: '/dashboard/projects/new',
				icon: Plus,
				roles: ['admin', 'foreman'],
			},
		],
	},
	{
		label: 'Planering',
		href: '/dashboard/planning',
		icon: Calendar,
		roles: ['admin', 'foreman', 'finance'],
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
		<aside className='hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-gray-950'>
			<div className='flex flex-col flex-1 min-h-0'>
				{/* Header - Logo area */}
				<div className="px-3 py-2 flex items-center justify-start border-b border-gray-200 bg-white">
					<Link href="/dashboard" className="flex items-center justify-start">
						<img
							src="/images/EP-Flat.png"
							alt="EP Tracker"
							style={{ height: '150px', width: 'auto', minHeight: '150px', maxHeight: '150px', display: 'block' }}
						/>
					</Link>
				</div>

				<nav className='flex-1 px-4 py-4 space-y-1 overflow-y-auto'>
					{visibleNavItems.map((item) => {
						// For dashboard, exact match. For others, check if pathname starts with href
						const isActive = item.href === '/dashboard' 
							? pathname === item.href 
							: pathname.startsWith(item.href);
						const Icon = item.icon;
						
						// Filter sub-items based on user role
						const visibleSubItems = item.subItems?.filter(subItem => 
							subItem.roles.includes(userRole)
						) || [];

						return (
							<div key={item.href}>
								<Link
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
								
								{/* Sub-navigation - only show when parent is active */}
								{isActive && visibleSubItems.length > 0 && (
									<div className='ml-8 mt-1 space-y-1'>
										{visibleSubItems.map((subItem) => {
											const isSubItemActive = pathname === subItem.href;
											const SubIcon = subItem.icon;
											
											return (
												<Link
													key={subItem.href}
													href={subItem.href}
													className={cn(
														'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
														isSubItemActive
															? 'bg-orange-100 text-orange-700 font-medium'
															: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
													)}
												>
													<SubIcon className={cn(
														'flex-shrink-0 h-4 w-4',
														isSubItemActive ? 'text-orange-600' : 'text-gray-400'
													)} />
													{subItem.label}
												</Link>
											);
										})}
									</div>
								)}
							</div>
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
