import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, MapPin, Users, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function WorksitesPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organizations
	const { data: memberships } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true);

	if (!memberships || memberships.length === 0) {
		return (
			<div className='flex-1 overflow-auto pb-20 md:pb-0'>
				<div className='px-4 md:px-8 py-6'>
					<p className='text-muted-foreground'>Du är inte medlem i någon organisation.</p>
				</div>
			</div>
		);
	}

	const orgIds = memberships.map(m => m.org_id);
	const canEdit = memberships.some(m => ['admin', 'foreman'].includes(m.role));

	// Fetch all projects with active worksite
	const { data: worksites } = await supabase
		.from('projects')
		.select(`
			id,
			name,
			project_number,
			worksite_code,
			worksite_enabled,
			address_line1,
			address_line2,
			city,
			country,
			status,
			org_id
		`)
		.in('org_id', orgIds)
		.eq('worksite_enabled', true)
		.order('name', { ascending: true });

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<div className='px-4 md:px-8 py-6 space-y-6'>
				{/* Header */}
				<div>
					<div className='flex items-center justify-between mb-2'>
						<h1 className='text-3xl md:text-4xl font-bold tracking-tight'>Personalliggare</h1>
					</div>
					<p className='text-muted-foreground'>
						Översikt över alla projekt med aktiv personalliggare
					</p>
				</div>

				{/* Worksites List */}
				<div className='space-y-4'>
					{worksites && worksites.length > 0 ? (
						worksites.map((worksite) => (
							<Card key={worksite.id} className='border-2 hover:border-gray-300 transition-colors'>
								<CardHeader>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<CardTitle className='flex items-center gap-2 mb-1'>
												{worksite.name}
												{worksite.status === 'active' && (
													<Badge className='bg-green-500 hover:bg-green-600'>Aktiv</Badge>
												)}
											</CardTitle>
											<CardDescription>
												{worksite.project_number && (
													<span>Projekt: {worksite.project_number}</span>
												)}
												{worksite.worksite_code && (
													<span className='ml-4'>Plats-ID: {worksite.worksite_code}</span>
												)}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className='grid gap-4 md:grid-cols-2'>
										{/* Address */}
										<div className='space-y-2'>
											<div className='flex items-center gap-2 text-sm font-medium'>
												<MapPin className='w-4 h-4 text-muted-foreground' />
												Adress
											</div>
											<div className='text-sm text-muted-foreground pl-6'>
												{worksite.address_line1 && <div>{worksite.address_line1}</div>}
												{worksite.address_line2 && <div>{worksite.address_line2}</div>}
												{(worksite.city || worksite.country) && (
													<div>{[worksite.city, worksite.country].filter(Boolean).join(', ')}</div>
												)}
											</div>
										</div>

										{/* Actions */}
										<div className='space-y-2'>
											<div className='flex items-center gap-2 text-sm font-medium'>
												<QrCode className='w-4 h-4 text-muted-foreground' />
												Snabbåtgärder
											</div>
											<div className='flex flex-wrap gap-2 pl-6'>
												<Link href={`/dashboard/projects/${worksite.id}`}>
													<Button variant='outline' size='sm'>
														Visa projekt
													</Button>
												</Link>
												<Link href={`/worksites/${worksite.id}/checkin`}>
													<Button variant='outline' size='sm'>
														<CheckCircle className='w-4 h-4 mr-1' />
														Check-in
													</Button>
												</Link>
												<Link href={`/worksites/${worksite.id}/control`}>
													<Button variant='outline' size='sm'>
														<ExternalLink className='w-4 h-4 mr-1' />
														Kontrollvy
													</Button>
												</Link>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))
					) : (
						<Card className='border-2 border-dashed'>
							<CardContent className='py-12 text-center'>
								<QrCode className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
								<h3 className='text-lg font-semibold mb-2'>Inga aktiva personalliggare</h3>
								<p className='text-sm text-muted-foreground mb-4'>
									Aktivera personalliggare i ett projekt för att se det här
								</p>
								<Link href='/dashboard/projects'>
									<Button>Gå till Projekt</Button>
								</Link>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}

