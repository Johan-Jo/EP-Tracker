import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeEntryForm } from '@/components/time/time-entry-form';
import { TimeEntriesList } from '@/components/time/time-entries-list';
import { CrewClockIn } from '@/components/time/crew-clock-in';
import { Clock, Users, List } from 'lucide-react';

export default async function TimePage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization and role
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Ingen aktiv organisation hittades</p>
			</div>
		);
	}

	const canManageCrew = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Tidrapportering</h1>
				<p className='text-muted-foreground mt-2'>
					Logga arbetstid och bemanning
				</p>
			</div>

			<Tabs defaultValue="list" className="space-y-6">
				<TabsList>
					<TabsTrigger value="list">
						<List className="w-4 h-4 mr-2" />
						Översikt
					</TabsTrigger>
					<TabsTrigger value="manual">
						<Clock className="w-4 h-4 mr-2" />
						Lägg till tid
					</TabsTrigger>
					{canManageCrew && (
						<TabsTrigger value="crew">
							<Users className="w-4 h-4 mr-2" />
							Starta bemanning
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="list" className="space-y-4">
					<TimeEntriesList orgId={membership.org_id} />
				</TabsContent>

				<TabsContent value="manual">
					<TimeEntryForm orgId={membership.org_id} />
				</TabsContent>

				{canManageCrew && (
					<TabsContent value="crew">
						<CrewClockIn orgId={membership.org_id} />
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}

