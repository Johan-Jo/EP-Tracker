import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import ProjectsClient from './projects-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectsPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<Card>
					<CardHeader>
						<CardTitle>Inga organisationer hittades</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground'>
							Du behöver vara medlem i en organisation för att skapa projekt.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();
	const search = typeof searchParams.search === 'string' ? searchParams.search : '';
	const status = typeof searchParams.status === 'string' ? searchParams.status : 'active';

	// Build query - simplified to use single org_id
	let query = supabase
		.from('projects')
		.select('*, phases(count)')
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false });

	// Apply filters
	if (status && status !== 'all') {
		query = query.eq('status', status);
	}

	if (search) {
		query = query.or(
			`name.ilike.%${search}%,project_number.ilike.%${search}%,client_name.ilike.%${search}%`
		);
	}

	const { data: projects, error } = await query;

	if (error) {
		console.error('Error fetching projects:', error);
	}

	// Fetch time entries for each project to calculate hours worked
	const projectsWithHours = await Promise.all(
		(projects || []).map(async (project) => {
			const { data: timeEntries, error: timeError } = await supabase
				.from('time_entries')
				.select('start_at, stop_at')
				.eq('project_id', project.id);

			if (timeError) {
				console.error(`Error fetching time entries for project ${project.id}:`, timeError);
			}

			// Calculate total hours (including active entries)
			const totalHours = timeEntries?.reduce((sum, entry) => {
				const start = new Date(entry.start_at);
				// Use stop_at if it exists, otherwise use current time for active entries
				const end = entry.stop_at ? new Date(entry.stop_at) : new Date();
				const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
				return sum + hours;
			}, 0) || 0;

			return {
				...project,
				total_hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
			};
		})
	);

	const canCreateProjects = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<ProjectsClient 
			projects={projectsWithHours || []} 
			canCreateProjects={canCreateProjects}
			search={search}
			status={status}
		/>
	);
}

