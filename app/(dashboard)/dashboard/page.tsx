import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, Clock, Package, Plus } from 'lucide-react';
import { getSession } from '@/lib/auth/get-session';
import { TimerWidget } from '@/components/time/timer-widget';
import { DashboardWithOnboarding } from '@/components/dashboard/dashboard-with-onboarding';

export default async function DashboardPage() {
	// Use cached session
	const { user, profile, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	const supabase = await createClient();

	// Fetch stats in parallel for better performance
	const startOfWeek = new Date();
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	const [projectsResult, timeEntriesResult, materialsResult, expensesResult] = await Promise.all([
		supabase
			.from('projects')
			.select('*', { count: 'exact', head: true }),
		supabase
			.from('time_entries')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('start_at', startOfWeek.toISOString()),
		supabase
			.from('materials')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('created_at', startOfWeek.toISOString()),
		supabase
			.from('expenses')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('created_at', startOfWeek.toISOString()),
	]);

	const projectsCount = projectsResult.count;
	const timeEntriesCount = timeEntriesResult.count;
	const materialsCount = (materialsResult.count || 0) + (expensesResult.count || 0);

	// Get organization for onboarding
	const { data: organization } = membership
		? await supabase
				.from('organizations')
				.select('name')
				.eq('id', membership.org_id)
				.single()
		: { data: null };

	return (
		<div className='container mx-auto p-6 lg:p-8'>
			<DashboardWithOnboarding
				userName={profile?.full_name}
				organizationName={organization?.name}
				userRole={membership?.role}
			>
				<div className="space-y-8">
					<div data-tour="dashboard-header">
						<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
							Välkommen, {profile?.full_name || 'användare'}! 👋
						</h1>
						<p className='text-gray-600 dark:text-gray-400 mt-2'>
							Här är en översikt över dina projekt och aktiviteter.
						</p>
					</div>

					{/* Timer Widget */}
					{membership && (
						<div data-tour="timer-widget">
							<TimerWidget userId={user.id} orgId={membership.org_id} inline={true} />
						</div>
					)}

					{/* Quick actions */}
					<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950' data-tour="quick-actions">
						<CardHeader>
							<CardTitle className='text-gray-900 dark:text-white'>Snabbåtgärder</CardTitle>
							<CardDescription className='text-gray-600 dark:text-gray-400'>
								Vanliga uppgifter för att komma igång snabbt
							</CardDescription>
						</CardHeader>
						<CardContent className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<Button asChild className='w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'>
								<Link href='/dashboard/projects/new'>
									<Plus className='w-4 h-4 mr-2' />
									Nytt projekt
								</Link>
							</Button>
							<Button asChild variant='outline' className='w-full border-gray-300 dark:border-gray-700'>
								<Link href='/dashboard/time'>
									<Clock className='w-4 h-4 mr-2' />
									Logga tid
								</Link>
							</Button>
							<Button asChild variant='outline' className='w-full border-gray-300 dark:border-gray-700'>
								<Link href='/dashboard/materials'>
									<Package className='w-4 h-4 mr-2' />
									Lägg till material
								</Link>
							</Button>
							<Button asChild variant='outline' className='w-full border-gray-300 dark:border-gray-700'>
								<Link href='/dashboard/approvals'>
									Godkännanden
								</Link>
							</Button>
						</CardContent>
					</Card>

					{/* Quick stats */}
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3' data-tour="stats">
						<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
							<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
								<CardTitle className='text-sm font-medium text-gray-900 dark:text-white'>Aktiva Projekt</CardTitle>
								<FolderKanban className='w-5 h-5 text-blue-500' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold text-gray-900 dark:text-white'>{projectsCount || 0}</div>
								<p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
									<Link href='/dashboard/projects' className='text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-500 dark:hover:text-orange-400'>
										Visa alla projekt →
									</Link>
								</p>
							</CardContent>
						</Card>

						<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
							<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
								<CardTitle className='text-sm font-medium text-gray-900 dark:text-white'>Tidrapporter denna vecka</CardTitle>
								<Clock className='w-5 h-5 text-green-500' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold text-gray-900 dark:text-white'>{timeEntriesCount || 0}</div>
								<p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
									<Link href='/dashboard/time' className='text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-500 dark:hover:text-orange-400'>
										Logga tid →
									</Link>
								</p>
							</CardContent>
						</Card>

						<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
							<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
								<CardTitle className='text-sm font-medium text-gray-900 dark:text-white'>Material & Utlägg denna vecka</CardTitle>
								<Package className='w-5 h-5 text-orange-500' />
							</CardHeader>
							<CardContent>
								<div className='text-2xl font-bold text-gray-900 dark:text-white'>{materialsCount}</div>
								<p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
									<Link href='/dashboard/materials' className='text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-500 dark:hover:text-orange-400'>
										Hantera material & utlägg →
									</Link>
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</DashboardWithOnboarding>
		</div>
	);
}

