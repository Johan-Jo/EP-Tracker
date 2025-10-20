import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, MapPin } from 'lucide-react';
import { ProjectsFilter } from '@/components/projects/projects-filter';
import { ProjectsList } from '@/components/projects/projects-list';
import { getSession } from '@/lib/auth/get-session';

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

	const canCreateProjects = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<div className='p-4 md:p-8 space-y-6'>
			{/* Header */}
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Projekt</h1>
					<p className='text-muted-foreground mt-1'>
						Hantera dina byggprojekt och arbetsorder
					</p>
				</div>
				{canCreateProjects && (
					<Button asChild>
						<Link href='/dashboard/projects/new'>
							<Plus className='w-4 h-4 mr-2' />
							Nytt projekt
						</Link>
					</Button>
				)}
			</div>

			{/* Search and filters */}
			<div className='flex flex-col gap-4 md:flex-row'>
				<div className='relative flex-1'>
					<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
					<Input
						type='search'
						placeholder='Sök projekt...'
						className='pl-10'
						defaultValue={search}
						name='search'
					/>
				</div>
				<ProjectsFilter currentStatus={status} />
			</div>

			{/* Projects grid */}
			{projects && projects.length > 0 ? (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{projects.map((project) => (
						<Link key={project.id} href={`/dashboard/projects/${project.id}`}>
							<Card className='hover:shadow-lg transition-shadow cursor-pointer h-full'>
								<CardHeader>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<CardTitle className='text-lg line-clamp-1'>
												{project.name}
											</CardTitle>
											{project.project_number && (
												<p className='text-sm text-muted-foreground mt-1'>
													#{project.project_number}
												</p>
											)}
										</div>
										<Badge
											variant={
												project.status === 'active'
													? 'default'
													: project.status === 'paused'
													? 'secondary'
													: 'outline'
											}
										>
											{project.status === 'active' && 'Aktiv'}
											{project.status === 'paused' && 'Pausad'}
											{project.status === 'completed' && 'Klar'}
											{project.status === 'archived' && 'Arkiverad'}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className='space-y-2'>
									{project.client_name && (
										<p className='text-sm'>
											<span className='font-medium'>Kund:</span> {project.client_name}
										</p>
									)}
									{project.site_address && (
										<p className='text-sm flex items-start gap-2'>
											<MapPin className='w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground' />
											<span className='line-clamp-2'>{project.site_address}</span>
										</p>
									)}
									<div className='pt-2 text-xs text-muted-foreground'>
										{project.phases?.[0]?.count || 0} faser
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			) : (
				<Card>
					<CardContent className='py-12 text-center'>
						<p className='text-muted-foreground mb-4'>
							{search || status !== 'active'
								? 'Inga projekt hittades med dessa filter'
								: 'Du har inga projekt än'}
						</p>
						{!search && status === 'active' && canCreateProjects && (
							<Button asChild>
								<Link href='/dashboard/projects/new'>
									<Plus className='w-4 h-4 mr-2' />
									Skapa ditt första projekt
								</Link>
							</Button>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

