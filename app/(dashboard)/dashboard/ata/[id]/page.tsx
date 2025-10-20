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
		<div className='p-4 md:p-8 space-y-6'>
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/ata">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>ÄTA-detaljer</h1>
				</div>
			</div>

			<AtaDetailClient ataId={id} userRole={membership.role as 'admin' | 'foreman' | 'worker' | 'finance'} />
		</div>
	);
}

