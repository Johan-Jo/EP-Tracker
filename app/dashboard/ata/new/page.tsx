import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { AtaForm } from '@/components/ata/ata-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PageProps {
	searchParams: Promise<{ project_id?: string }>;
}

export default async function NewAtaPage(props: PageProps) {
	const searchParams = await props.searchParams;
	const projectId = searchParams.project_id;
	
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
	// Finance role cannot create ÄTA
	if (membership.role === 'finance') {
		redirect('/dashboard/ata');
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div className='flex items-center gap-4'>
				<Link href='/dashboard/ata'>
					<Button variant='ghost' size='sm'>
						<ArrowLeft className='w-4 h-4 mr-2' />
						Tillbaka
					</Button>
				</Link>
			</div>

			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Skapa ÄTA</h1>
				<p className='text-muted-foreground mt-2'>
					Skapa ett nytt ändrings- eller tilläggsarbete
				</p>
			</div>

		<div className='max-w-3xl'>
			<AtaForm 
				userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} 
				projectId={projectId}
			/>
		</div>
		</div>
	);
}

