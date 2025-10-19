import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function DiaryPage() {
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

	// Check role
	if (membership.role === 'worker') {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Du har inte behörighet att se dagbok</p>
			</div>
		);
	}

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Dagbok</h1>
					<p className='text-muted-foreground mt-2'>
						AFC-stil dagboksposter för dina projekt
					</p>
				</div>
				<Button asChild>
					<Link href="/dashboard/diary/new">
						<Plus className="h-4 w-4 mr-2" />
						Ny dagbokspost
					</Link>
				</Button>
			</div>

			<div className="text-center py-12">
				<BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
				<h3 className="text-lg font-semibold mb-2">Dagboksfunktion kommer snart</h3>
				<p className="text-muted-foreground mb-4">
					Dagboksformulär och lista är under utveckling
				</p>
			</div>
		</div>
	);
}

