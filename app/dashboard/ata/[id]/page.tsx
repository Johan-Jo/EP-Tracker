import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AtaDetailClient } from '@/components/ata/ata-detail-client';

export default async function AtaDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

	// Finance role cannot access ÄTA
	if (membership.role === 'finance') {
		redirect('/dashboard/ata');
	}

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center gap-4'>
						<Button 
							variant='ghost' 
							size='icon' 
							asChild
							className='hover:bg-orange-50 hover:text-orange-600'
						>
							<Link href='/dashboard/ata'>
								<ArrowLeft className='h-5 w-5' />
							</Link>
						</Button>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>ÄTA-detaljer</h1>
							<p className='text-sm text-muted-foreground'>Fullständig information om ändring/tillägg</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6'>
				<AtaDetailClient
					ataId={id}
					userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue'}
				/>
			</main>
		</div>
	);
}

