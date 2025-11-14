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
	Calendar,
	QrCode,
	X,
	DollarSign,
	ContactRound,
	Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';

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
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
	{
		label: 'Projekt',
		href: '/dashboard/projects',
		icon: FolderKanban,
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
	{
		label: 'Tid',
		href: '/dashboard/time',
		icon: Clock,
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
	{
		label: 'Material',
		href: '/dashboard/materials',
		icon: Package,
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
];

// Secondary navigation items (shown in menu modal)
const menuItems: NavItem[] = [
	{
		label: 'Kunder',
		href: '/dashboard/customers',
		icon: ContactRound,
		roles: ['admin', 'foreman', 'finance'],
	},
	{
		label: 'Personal',
		href: '/dashboard/employees',
		icon: Users,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Personalliggare',
		href: '/dashboard/worksites',
		icon: QrCode,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Planering',
		href: '/dashboard/planning',
		icon: Calendar,
		roles: ['admin', 'foreman', 'finance'],
	},
	{
		label: 'ÄTA',
		href: '/dashboard/ata',
		icon: FileEdit,
		roles: ['admin', 'foreman', 'worker', 'ue'],
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
		label: 'Löneunderlag',
		href: '/dashboard/payroll',
		icon: DollarSign,
		roles: ['admin', 'foreman'],
	},
	{
		label: 'Hjälp',
		href: '/dashboard/help',
		icon: HelpCircle,
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
	{
		label: 'Inställningar',
		href: '/dashboard/settings',
		icon: Settings,
		roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
	},
];

interface MobileNavProps {
	userRole: UserRole;
}

export function MobileNav({ userRole }: MobileNavProps) {
	const pathname = usePathname();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [pressedItem, setPressedItem] = useState<string | null>(null);

	// Filter items based on user role
	const visibleMainItems = mainNavItems.filter((item) => item.roles.includes(userRole));
	const visibleMenuItems = menuItems.filter((item) => item.roles.includes(userRole));

	// Check if current path is in menu items
	const isMenuActive = visibleMenuItems.some((item) => pathname.startsWith(item.href));

	return (
		<>
			{isMenuOpen && (
				<div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden dark:bg-black/70' onClick={() => setIsMenuOpen(false)}>
					<div
						className='fixed bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[var(--color-card)] p-6 text-[var(--color-card-foreground)] shadow-lg'
						onClick={(e) => e.stopPropagation()}
					>
						<div className='mb-6 flex items-center justify-between'>
							<h2 className='text-xl font-semibold'>Meny</h2>
							<button
								onClick={() => setIsMenuOpen(false)}
								className='rounded-lg p-2 transition-colors hover:bg-muted dark:hover:bg-gray-800'
							>
								<X className='h-5 w-5' />
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
											'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
											isActive
												? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
												: 'text-muted-foreground hover:bg-muted dark:text-gray-400 dark:hover:bg-gray-800'
										)}
									>
										<Icon className='h-5 w-5' />
										<span className='font-medium'>{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			)}

			<nav className='fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden dark:border-gray-800 dark:bg-[var(--color-gray-950)]'>
				<div className='flex h-16 items-stretch'>
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
							onPointerDown={() => setPressedItem(item.href)}
							onPointerUp={() => setPressedItem(null)}
							onPointerLeave={() => setPressedItem(null)}
							className={cn(
								'relative flex flex-1 flex-col items-center justify-center transition-transform duration-150',
								pressedItem === item.href ? 'scale-95' : 'scale-100'
							)}
						>
							{isActive && (
								<div className='absolute top-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-b-full bg-orange-500' />
							)}
							<span
								className={cn(
									'absolute inset-0 rounded-t-xl transition-colors',
									pressedItem === item.href
										? 'bg-orange-500/10 dark:bg-orange-400/10'
										: 'bg-transparent'
								)}
							/>
							<Icon className={cn(
								'w-6 h-6 mb-1',
								isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
							)} />
							<span className={cn(
								'block text-xs font-medium',
								isActive ? 'text-orange-600 dark:text-orange-300' : 'text-gray-600 dark:text-gray-400'
							)}>
								{item.label}
							</span>
						</Link>
						);
					})}
					
					{/* Menu Button */}
					<button
						onClick={() => setIsMenuOpen(true)}
						onPointerDown={() => setPressedItem('menu')}
						onPointerUp={() => setPressedItem(null)}
						onPointerLeave={() => setPressedItem(null)}
						className={cn(
							'relative flex flex-1 flex-col items-center justify-center transition-transform duration-150',
							pressedItem === 'menu' ? 'scale-95' : 'scale-100'
						)}
					>
						{isMenuActive && (
							<div className='absolute top-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-b-full bg-orange-500' />
						)}
						<span
							className={cn(
								'absolute inset-0 rounded-t-xl transition-colors',
								pressedItem === 'menu'
									? 'bg-orange-500/10 dark:bg-orange-400/10'
									: 'bg-transparent'
							)}
						/>
						<Menu className={cn(
							'w-6 h-6 mb-1',
							isMenuActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
						)} />
						<span className={cn(
							'block text-xs font-medium',
							isMenuActive ? 'text-orange-600 dark:text-orange-300' : 'text-gray-600 dark:text-gray-400'
						)}>
							Meny
						</span>
					</button>
				</div>
			</nav>
		</>
	);
}

