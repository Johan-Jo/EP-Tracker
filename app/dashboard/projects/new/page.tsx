import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProjectForm } from '@/components/projects/project-form';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session
import { createProject } from '@/app/actions/create-project'; // Server action in separate file
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewProjectPage() {
	// EPIC 26: Use cached session to avoid duplicate queries
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<div className='max-w-2xl mx-auto'>
					<h1 className='text-2xl font-bold mb-4'>Ingen organisation hittades</h1>
					<p className='text-muted-foreground'>
						Du behöver vara medlem i en organisation för att skapa projekt.
					</p>
				</div>
			</div>
		);
	}

	const orgId = membership.org_id;
	const userRole = membership.role;

	// Only admin and foreman can create projects - redirect others
	if (userRole !== 'admin' && userRole !== 'foreman') {
		redirect('/dashboard/projects');
	}

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<div className='px-4 md:px-8 py-6'>
				<div className='max-w-4xl mx-auto space-y-6'>
				{/* Breadcrumb */}
				<nav className='flex items-center gap-2 text-sm text-muted-foreground mb-4'>
					<Link href='/dashboard' className='hover:text-foreground transition-colors'>
						Dashboard
					</Link>
					<span>/</span>
					<Link href='/dashboard/projects' className='hover:text-foreground transition-colors'>
						Projekt
					</Link>
					<span>/</span>
					<span className='text-foreground font-medium'>Skapa nytt</span>
				</nav>

					{/* Header */}
					<Card>
						<CardHeader>
							<CardTitle className='text-3xl tracking-tight'>Skapa nytt projekt</CardTitle>
							<CardDescription>
								Fyll i projektets information nedan för att komma igång
							</CardDescription>
						</CardHeader>
					</Card>

					<ProjectForm orgId={orgId} onSubmit={createProject} />
				</div>
			</div>
		</div>
	);
}

