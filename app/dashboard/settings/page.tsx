import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { getSession } from '@/lib/auth/get-session';

export default async function SettingsPage() {
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	const isAdmin = membership?.role === 'admin';
	const canManageUsers = membership?.role && ['admin', 'foreman'].includes(membership.role);

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Inställningar</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Hantera ditt konto och organisationsinställningar
				</p>
			</div>

			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
				{isAdmin && (
					<Link href='/dashboard/settings/organization'>
						<Card className='border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full dark:border-gray-800 dark:bg-gray-950'>
							<CardHeader>
								<div className='flex items-center justify-between'>
									<Building2 className='w-8 h-8 text-orange-600 dark:text-orange-500' />
									<ChevronRight className='w-5 h-5 text-gray-400' />
								</div>
								<CardTitle className='mt-4 text-gray-900 dark:text-white'>Organisation</CardTitle>
								<CardDescription className='text-gray-600 dark:text-gray-400'>
									Hantera organisationsinformation och standardinställningar
								</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				)}

				{canManageUsers && (
					<Link href='/dashboard/settings/users'>
						<Card className='border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full dark:border-gray-800 dark:bg-gray-950'>
							<CardHeader>
								<div className='flex items-center justify-between'>
									<Users className='w-8 h-8 text-orange-600 dark:text-orange-500' />
									<ChevronRight className='w-5 h-5 text-gray-400' />
								</div>
								<CardTitle className='mt-4 text-gray-900 dark:text-white'>Användare</CardTitle>
								<CardDescription className='text-gray-600 dark:text-gray-400'>
									Hantera teammedlemmar, roller och behörigheter
								</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				)}

				<Link href='/dashboard/settings/profile'>
					<Card className='border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full dark:border-gray-800 dark:bg-gray-950'>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<SettingsIcon className='w-8 h-8 text-orange-600 dark:text-orange-500' />
								<ChevronRight className='w-5 h-5 text-gray-400' />
							</div>
							<CardTitle className='mt-4 text-gray-900 dark:text-white'>Min profil</CardTitle>
							<CardDescription className='text-gray-600 dark:text-gray-400'>
								Uppdatera dina personliga uppgifter och inställningar
							</CardDescription>
						</CardHeader>
					</Card>
				</Link>
			</div>

			<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
				<CardHeader>
					<CardTitle className='text-gray-900 dark:text-white'>Systeminformation</CardTitle>
				</CardHeader>
				<CardContent className='space-y-2 text-sm'>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Version:</span>
						<span className='font-medium'>0.1.0 (Phase 1 MVP)</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>EPIC:</span>
						<span className='font-medium'>EPIC 3 - Core UI & Projects Management</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Miljö:</span>
						<span className='font-medium'>Development</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

