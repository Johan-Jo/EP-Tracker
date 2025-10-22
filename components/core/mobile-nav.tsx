'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
	LayoutDashboard,
	FolderKanban,
	Clock,
	Package,
	Menu,
	CheckSquare,
	Settings,
	FileEdit,
	BookOpen,
	HelpCircle,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance';

interface NavItem {
	label: string;
	href: string;
	icon: any;
	roles: UserRole[];
}

// Main navigation items (shown in footer)
const mainNavItems: NavItem[] = [
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
];

// Secondary navigation items (shown in menu modal)
const menuItems: NavItem[] = [
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
		label: 'Godkänn',
		href: '/dashboard/approvals',
		icon: CheckSquare,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Hjälp',
		href: '/dashboard/help',
		icon: HelpCircle,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
	{
		label: 'Inställningar',
		href: '/dashboard/settings',
		icon: Settings,
		roles: ['admin', 'foreman', 'worker', 'finance'],
	},
];

interface MobileNavProps {
	userRole: UserRole;
}

export function MobileNav({ userRole }: MobileNavProps) {
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// Filter items based on user role
	const visibleMainItems = mainNavItems.filter((item) => item.roles.includes(userRole));
	const visibleMenuItems = menuItems.filter((item) => item.roles.includes(userRole));

	// Check if current path is in menu items
	const isMenuActive = visibleMenuItems.some((item) => pathname.startsWith(item.href));

	return (
		<>
			{/* Menu Modal */}
			{isMenuOpen && (
				<div className='fixed inset-0 z-50 bg-black/50 md:hidden' onClick={() => setIsMenuOpen(false)}>
					<div
						className='fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto'
						onClick={(e) => e.stopPropagation()}
					>
						<div className='flex items-center justify-between mb-6'>
							<h2 className='text-xl font-semibold'>Meny</h2>
							<button
								onClick={() => setIsMenuOpen(false)}
								className='p-2 rounded-lg hover:bg-gray-100'
							>
								<X className='w-5 h-5' />
							</button>
						</div>
						<div className='grid gap-2'>
							{visibleMenuItems.map((item) => {
								const isActive = pathname === item.href;
								const Icon = item.icon;

								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setIsMenuOpen(false)}
										className={cn(
											'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
											isActive
												? 'bg-orange-50 text-orange-600'
												: 'hover:bg-gray-100'
										)}
									>
										<Icon className='w-5 h-5' />
										<span className='font-medium'>{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Bottom Navigation */}
			<nav className='fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden'>
				<div className='flex items-stretch h-16'>
					{visibleMainItems.map((item) => {
						// Dashboard should be exact match, others can match sub-paths
						const isActive = item.href === '/dashboard'
							? pathname === item.href
							: pathname.startsWith(item.href);
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className='flex flex-col items-center justify-center flex-1 relative'
							>
								{/* Active indicator line */}
								{isActive && (
									<div className='absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-orange-500 rounded-b-full' />
								)}
								<Icon className={cn(
									'w-6 h-6 mb-1',
									isActive ? 'text-orange-500' : 'text-gray-400'
								)} />
								<span className={cn(
									'text-xs',
									isActive ? 'text-orange-500 font-medium' : 'text-gray-600'
								)}>
									{item.label}
								</span>
							</Link>
						);
					})}
					
					{/* Menu Button */}
					<button
						onClick={() => setIsMenuOpen(true)}
						className='flex flex-col items-center justify-center flex-1 relative'
					>
						{/* Active indicator line */}
						{isMenuActive && (
							<div className='absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-orange-500 rounded-b-full' />
						)}
						<Menu className={cn(
							'w-6 h-6 mb-1',
							isMenuActive ? 'text-orange-500' : 'text-gray-400'
						)} />
						<span className={cn(
							'text-xs',
							isMenuActive ? 'text-orange-500 font-medium' : 'text-gray-600'
						)}>
							Meny
						</span>
					</button>
				</div>
			</nav>
		</>
	);
}

