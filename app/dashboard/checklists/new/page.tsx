import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ChecklistForm } from '@/components/checklists/checklist-form';

export default async function NewChecklistPage() {
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

	// Only admin and foreman can create checklists
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard/checklists');
	}

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" asChild>
							<Link href="/dashboard/checklists">
								<ArrowLeft className="h-5 w-5" />
							</Link>
						</Button>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Ny checklista</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								Skapa en ny checklista från mall eller egen
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-3xl mx-auto'>
				<ChecklistForm />
			</main>
		</div>
	);
}

