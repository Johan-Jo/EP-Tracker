import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { WorkOrderDetailClient } from '@/components/work-orders/work-order-detail-client';

export default async function WorkOrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
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

	const canEdit = membership.role === 'admin' || membership.role === 'foreman';
	const canDelete = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0 bg-gray-50 dark:bg-gray-900'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center gap-4'>
						<Button
							variant='ghost'
							size='icon'
							asChild
							className='hover:bg-primary/10 hover:text-primary'
						>
							<Link href='/dashboard/work-orders'>
								<ArrowLeft className='h-5 w-5' />
							</Link>
						</Button>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Arbetsorder-detaljer</h1>
							<p className='text-sm text-muted-foreground'>
								Fullständig information om arbetsorder
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 bg-gray-50 dark:bg-gray-900'>
				<WorkOrderDetailClient
					workOrderId={id}
					canEdit={canEdit}
					canDelete={canDelete}
				/>
			</main>
		</div>
	);
}

