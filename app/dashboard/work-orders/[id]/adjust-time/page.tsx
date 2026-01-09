import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdjustTimePage(props: PageProps) {
	const { id } = await props.params;
	const searchParams = await props.searchParams;
	const token = typeof searchParams.token === 'string' ? searchParams.token : null;

	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Ingen aktiv organisation hittades</p>
			</div>
		);
	}

	if (!token) {
		return (
			<div className='p-4 md:p-8 flex justify-center'>
				<Card className='max-w-lg w-full'>
					<CardHeader>
						<CardTitle>Ogiltig länk</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Denna länk saknar justeringstoken. Kontrollera att du öppnat mailet från EP Tracker och klickat på
							knappen &quot;Justera tid&quot;.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();

	const { data: workOrder, error } = await supabase
		.from('work_orders')
		.select('id, title, work_order_number, project:projects(name)')
		.eq('id', id)
		.eq('organization_id', membership.org_id)
		.single();

	if (error || !workOrder) {
		return (
			<div className='p-4 md:p-8 flex justify-center'>
				<Card className='max-w-lg w-full'>
					<CardHeader>
						<CardTitle>Arbetsorder hittades inte</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Arbetsordern finns inte längre eller så har du inte behörighet att se den.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const timePageUrl = `/dashboard/time?work_order_id=${id}`;

	return (
		<div className='p-4 md:p-8 flex justify-center bg-gray-50 dark:bg-gray-900 min-h-screen'>
			<Card className='max-w-lg w-full'>
				<CardHeader>
					<CardTitle>Justera registrerad tid</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<p className='text-muted-foreground'>
						Du är inloggad som <span className='font-semibold'>{user.user_metadata?.full_name || user.email}</span>.
					</p>
					<p>
						<strong>Arbetsorder:</strong> {workOrder.work_order_number} – {workOrder.title}
					</p>
					{(workOrder as any).project?.name && (
						<p>
							<strong>Projekt:</strong> {(workOrder as any).project.name}
						</p>
					)}
					<p className='text-sm text-muted-foreground mt-2'>
						För att justera den registrerade tiden använder du den vanliga tidssidan. Alla tider som du
						registrerar eller ändrar där, med denna arbetsorder vald, kommer automatiskt att kopplas till
						arbetsordern.
					</p>
					<p className='text-sm text-muted-foreground'>
						När du är klar kan du gå tillbaka till mailet och klicka på &quot;Godkänn registrerad tid&quot; för att
						bekräfta.
					</p>
				</CardContent>
				<CardFooter className='flex justify-between gap-2'>
					<Button asChild>
						<a href={timePageUrl}>Öppna tidssidan</a>
					</Button>
					<Button variant='outline' asChild>
						<a href={`/dashboard/work-orders/${id}`}>Öppna arbetsorder</a>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}


