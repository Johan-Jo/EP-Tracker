import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProjectForm } from '@/components/projects/project-form';
import { ProjectFormData } from '@/lib/schemas/project';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

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

	async function createProject(data: ProjectFormData) {
		'use server';
		
		// Server actions need fresh auth check (can't use cached getSession)
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();

		if (!user) {
			throw new Error('Inte autentiserad');
		}

		// Get membership for org_id
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			throw new Error('Ingen aktiv organisation');
		}

		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				org_id: membership.org_id,
				created_by: user.id,
				...data,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating project:', error);
			throw new Error(error.message);
		}

		revalidatePath('/dashboard/projects');
		redirect(`/dashboard/projects/${project.id}`);
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
					<div className='bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-6'>
						<h1 className='text-3xl font-bold tracking-tight text-gray-900'>
							Skapa nytt projekt
						</h1>
						<p className='text-gray-600 mt-2'>
							Fyll i projektets information nedan för att komma igång
						</p>
					</div>

					<ProjectForm orgId={orgId} onSubmit={createProject} />
				</div>
			</div>
		</div>
	);
}

