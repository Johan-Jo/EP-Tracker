'use client';

import Link from 'next/link';
import { Building2, Users, User, Bell, ChevronRight } from 'lucide-react';

interface SettingsPageNewProps {
	isAdmin: boolean;
	canManageUsers: boolean;
}

export function SettingsPageNew({ isAdmin, canManageUsers }: SettingsPageNewProps) {
	const settingsOptions = [
		{
			id: 'organization',
			icon: Building2,
			title: 'Organisation',
			description: 'Hantera organisationsinformation och standardinställningar',
			href: '/dashboard/settings/organization',
			visible: isAdmin,
		},
		{
			id: 'users',
			icon: Users,
			title: 'Användare',
			description: 'Hantera teammedlemmar, roller och behörigheter',
			href: '/dashboard/settings/users',
			visible: canManageUsers,
		},
		{
			id: 'profile',
			icon: User,
			title: 'Min profil',
			description: 'Uppdatera dina personliga uppgifter och inställningar',
			href: '/dashboard/settings/profile',
			visible: true,
		},
		{
			id: 'notifications',
			icon: Bell,
			title: 'Notiser',
			description: 'Aktivera pushnotiser och hantera notifieringsinställningar',
			href: '/dashboard/settings/notifications',
			visible: true,
		},
	];

	const visibleOptions = settingsOptions.filter((option) => option.visible);

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>Inställningar</h1>
						<p className='text-sm text-muted-foreground'>Hantera ditt konto och organisationsinställningar</p>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				<div className='space-y-6'>
					{/* Settings Options Grid */}
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						{visibleOptions.map((option) => {
							const Icon = option.icon;
							return (
								<Link key={option.id} href={option.href}>
									<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group cursor-pointer h-full'>
										<div className='flex items-start justify-between mb-4'>
											<div className='p-2.5 rounded-lg bg-accent shrink-0'>
												<Icon className='w-6 h-6 text-primary' />
											</div>
											<ChevronRight className='w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200' />
										</div>
										<h3 className='text-lg font-semibold mb-2'>{option.title}</h3>
										<p className='text-sm text-muted-foreground leading-relaxed'>{option.description}</p>
									</div>
								</Link>
							);
						})}
					</div>

					{/* System Information */}
					<div className='bg-card border-2 border-border rounded-xl p-6'>
						<h3 className='text-lg font-semibold mb-4'>Systeminformation</h3>
						<div className='space-y-3'>
							<div className='flex justify-between items-center py-2 border-b border-border last:border-0'>
								<span className='text-sm text-muted-foreground'>Version:</span>
								<span className='text-sm font-medium'>0.1.0 (Phase 1 MVP)</span>
							</div>
							<div className='flex justify-between items-center py-2 border-b border-border last:border-0'>
								<span className='text-sm text-muted-foreground'>EPIC:</span>
								<span className='text-sm font-medium'>EPIC 3 - Core UI & Projects Management</span>
							</div>
							<div className='flex justify-between items-center py-2'>
								<span className='text-sm text-muted-foreground'>Miljö:</span>
								<span className='text-sm font-medium'>
									<span className='inline-flex items-center gap-2 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold'>
										<span className='w-1.5 h-1.5 bg-green-600 rounded-full'></span>
										Development
									</span>
								</span>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

