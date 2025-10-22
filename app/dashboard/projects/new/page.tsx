import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProjectForm } from '@/components/projects/project-form';
import { ProjectFormData } from '@/lib/schemas/project';
import { revalidatePath } from 'next/cache';

export default async function NewProjectPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization and role (first one for now)
	const { data: memberships } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.limit(1);

	if (!memberships || memberships.length === 0) {
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

	const orgId = memberships[0].org_id;
	const userRole = memberships[0].role;

	// Only admin and foreman can create projects - redirect others
	if (userRole !== 'admin' && userRole !== 'foreman') {
		redirect('/dashboard/projects');
	}

	async function createProject(data: ProjectFormData) {
		'use server';
		
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			throw new Error('Inte autentiserad');
		}

		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				org_id: orgId,
				created_by: user.id,
				...data,
			})
			.select()
			.single();

		if (error) {
			throw new Error(error.message);
		}

		revalidatePath('/dashboard/projects');
		redirect(`/dashboard/projects/${project.id}`);
	}

	return (
		<div className='p-4 md:p-8'>
			<div className='max-w-3xl mx-auto space-y-6'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Skapa nytt projekt</h1>
					<p className='text-muted-foreground mt-2'>
						Fyll i projektets information nedan
					</p>
				</div>

				<ProjectForm orgId={orgId} onSubmit={createProject} />
			</div>
		</div>
	);
}

