import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { AtaPageClient } from '@/components/ata/ata-page-client';

export default async function AtaPage() {
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

	// Workers can create ÄTA proposals, but only admin and foreman can approve
	// Finance role cannot access ÄTA
	if (membership.role === 'finance') {
		redirect('/dashboard');
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>ÄTA</h1>
				<p className='text-muted-foreground mt-2'>
					Hantera ändrings- och tilläggsarbeten
				</p>
			</div>

			<AtaPageClient 
				orgId={membership.org_id} 
				userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} 
			/>
		</div>
	);
}

