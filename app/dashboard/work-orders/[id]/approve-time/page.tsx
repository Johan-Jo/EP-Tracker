import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ApproveTimePage(props: PageProps) {
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
							Denna länk saknar godkännandetoken. Kontrollera att du öppnat mailet från EP Tracker och klickat
							på knappen &quot;Godkänn registrerad tid&quot;.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();

	const { data: workOrder, error } = await supabase
		.from('work_orders')
		.select('id, title, work_order_number, project:projects(name), actual_time_approved_at')
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

	const alreadyApproved = !!workOrder.actual_time_approved_at;

	async function approve() {
		'use server';

		const { user: currentUser, membership: currentMembership } = await getSession();
		if (!currentUser || !currentMembership) {
			redirect('/sign-in');
		}

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/work-orders/${id}/approve-time?token=${token}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				cache: 'no-store',
			}
		);

		if (!res.ok) {
			// On error we simply redirect back to detail page where toast will show error via query in future
			redirect(`/dashboard/work-orders/${id}`);
		}

		redirect(`/dashboard/work-orders/${id}`);
	}

	return (
		<div className='p-4 md:p-8 flex justify-center bg-gray-50 dark:bg-gray-900 min-h-screen'>
			<Card className='max-w-lg w-full'>
				<CardHeader>
					<CardTitle>Bekräfta registrerad tid</CardTitle>
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
					<p className='text-sm text-muted-foreground'>
						Bekräfta att den registrerade tiden stämmer. Efter din bekräftelse kommer en forman/administratör att få ett mail för att godkänna tiden.
					</p>
					{alreadyApproved && (
						<p className='text-sm text-amber-600'>
							Du har redan bekräftat tiden för denna arbetsorder. Du kan ändå gå till detaljsidan om du vill
							justera något.
						</p>
					)}
				</CardContent>
				<CardFooter className='flex justify-between gap-2'>
					<form action={approve}>
						<Button type='submit' disabled={alreadyApproved}>
							Bekräfta registrerad tid
						</Button>
					</form>
					<Button variant='outline' asChild>
						<a href={`/dashboard/work-orders/${id}`}>Öppna arbetsorder</a>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}


