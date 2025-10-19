import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, Clock, Package, Plus } from 'lucide-react';
import { getSession } from '@/lib/auth/get-session';
import { TimerWidget } from '@/components/time/timer-widget';

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

	return (
		<div className='p-4 md:p-8 space-y-8'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>
					Välkommen, {profile?.full_name || 'användare'}! 👋
				</h1>
				<p className='text-muted-foreground mt-2'>
					Här är en översikt över dina projekt och aktiviteter.
				</p>
			</div>

			{/* Timer Widget */}
			{membership && (
				<TimerWidget userId={user.id} orgId={membership.org_id} inline={true} />
			)}

			{/* Quick stats */}
			<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-sm font-medium'>Aktiva Projekt</CardTitle>
						<FolderKanban className='w-4 h-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{projectsCount || 0}</div>
						<p className='text-xs text-muted-foreground mt-1'>
							<Link href='/dashboard/projects' className='text-primary hover:underline'>
								Visa alla projekt →
							</Link>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
						<CardTitle className='text-sm font-medium'>Tidrapporter denna vecka</CardTitle>
						<Clock className='w-4 h-4 text-muted-foreground' />
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{timeEntriesCount || 0}</div>
						<p className='text-xs text-muted-foreground mt-1'>
							<Link href='/dashboard/time' className='text-primary hover:underline'>
								Logga tid →
							</Link>
						</p>
					</CardContent>
				</Card>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
					<CardTitle className='text-sm font-medium'>Material & Utlägg denna vecka</CardTitle>
					<Package className='w-4 h-4 text-muted-foreground' />
				</CardHeader>
				<CardContent>
					<div className='text-2xl font-bold'>{materialsCount}</div>
					<p className='text-xs text-muted-foreground mt-1'>
						<Link href='/dashboard/materials' className='text-primary hover:underline'>
							Hantera material & utlägg →
						</Link>
					</p>
				</CardContent>
			</Card>
			</div>

			{/* Quick actions */}
			<Card>
				<CardHeader>
					<CardTitle>Snabbåtgärder</CardTitle>
					<CardDescription>
						Vanliga uppgifter för att komma igång snabbt
					</CardDescription>
				</CardHeader>
				<CardContent className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
					<Button asChild className='w-full'>
						<Link href='/dashboard/projects/new'>
							<Plus className='w-4 h-4 mr-2' />
							Nytt projekt
						</Link>
					</Button>
					<Button asChild variant='outline' className='w-full'>
						<Link href='/dashboard/time'>
							<Clock className='w-4 h-4 mr-2' />
							Logga tid
						</Link>
					</Button>
					<Button asChild variant='outline' className='w-full'>
						<Link href='/dashboard/materials'>
							<Package className='w-4 h-4 mr-2' />
							Lägg till material
						</Link>
					</Button>
					<Button asChild variant='outline' className='w-full'>
						<Link href='/dashboard/approvals'>
							Godkännanden
						</Link>
					</Button>
				</CardContent>
			</Card>

		</div>
	);
}

