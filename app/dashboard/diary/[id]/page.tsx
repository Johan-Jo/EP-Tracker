import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DiaryDetailNew } from '@/components/diary/diary-detail-new';

export default async function DiaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

	// Only admin and foreman can view diary entries
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard/diary');
	}

	return (
		<div className='flex-1 overflow-auto'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center gap-4'>
						<Button variant='ghost' size='icon' asChild>
							<Link href='/dashboard/diary'>
								<ArrowLeft className='h-5 w-5' />
							</Link>
						</Button>
						<div>
							<h1 className='text-3xl font-bold tracking-tight'>Dagbokspost</h1>
						</div>
					</div>
				</div>
			</header>

			<DiaryDetailNew diaryId={id} />
		</div>
	);
}

