import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ApproveTimeManagerPage(props: PageProps) {
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

	// Check if user is manager/admin/owner
	if (!['admin', 'manager', 'owner'].includes(membership.role)) {
		return (
			<div className='p-4 md:p-8 flex justify-center'>
				<Card className='max-w-lg w-full'>
					<CardHeader>
						<CardTitle>Behörighet saknas</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Endast forman, administratörer och ägare kan godkänna registrerad tid.
						</p>
					</CardContent>
				</Card>
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
		.select(`
			id, 
			title, 
			work_order_number, 
			project:projects(name),
			actual_time_manager_approved_at,
			actual_time_worker_confirmed_at,
			worker:profiles!actual_time_worker_confirmed_by_id(full_name, email)
		`)
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

	const alreadyApproved = !!workOrder.actual_time_manager_approved_at;
	const worker = workOrder.worker as any;

	async function approve() {
		'use server';

		const { user: currentUser, membership: currentMembership } = await getSession();
		if (!currentUser || !currentMembership) {
			redirect('/sign-in');
		}

		if (!['admin', 'manager', 'owner'].includes(currentMembership.role)) {
			redirect(`/dashboard/work-orders/${id}`);
		}

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/work-orders/${id}/approve-time-manager?token=${token}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				cache: 'no-store',
			}
		);

		if (!res.ok) {
			redirect(`/dashboard/work-orders/${id}`);
		}

		redirect(`/dashboard/work-orders/${id}`);
	}

	return (
		<div className='p-4 md:p-8 flex justify-center bg-black min-h-screen'>
			<Card className='max-w-lg w-full'>
				<CardHeader>
					<CardTitle>Godkänn registrerad tid</CardTitle>
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
					{worker && (
						<p>
							<strong>Arbetare:</strong> {worker.full_name || worker.email}
						</p>
					)}
					{workOrder.actual_time_worker_confirmed_at && (
						<p className='text-sm text-green-600'>
							✓ Arbetaren bekräftade tiden {new Date(workOrder.actual_time_worker_confirmed_at).toLocaleString('sv-SE')}
						</p>
					)}
					{alreadyApproved && (
						<p className='text-sm text-amber-600'>
							Denna arbetsorder har redan godkänts av en forman/administratör. Du kan ändå gå till detaljsidan om du vill
							granska något.
						</p>
					)}
				</CardContent>
				<CardFooter className='flex justify-between gap-2'>
					<form action={approve}>
						<Button type='submit' disabled={alreadyApproved}>
							Godkänn registrerad tid
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

