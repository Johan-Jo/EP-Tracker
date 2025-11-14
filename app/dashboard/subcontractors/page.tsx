import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import SubcontractorsClient from './subcontractors-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SubcontractorsPage(props: PageProps) {
	const searchParams = await props.searchParams;

	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className="p-4 md:p-8">
				<Card>
					<CardHeader>
						<CardTitle>Inga organisationer hittades</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Du behöver vara medlem i en organisation för att se underentreprenörer.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();
	const search =
		typeof searchParams.search === 'string' ? searchParams.search : '';
	const includeArchived =
		typeof searchParams.includeArchived === 'string'
			? searchParams.includeArchived === 'true'
			: false;

	// Build query
	let query = supabase
		.from('subcontractors')
		.select('*')
		.eq('org_id', membership.org_id)
		.order('created_at', { ascending: false });

	// Apply filters
	if (!includeArchived) {
		query = query.eq('is_archived', false);
	}

	if (search) {
		query = query.or(
			`subcontractor_no.ilike.%${search}%,company_name.ilike.%${search}%,org_no.ilike.%${search}%,email.ilike.%${search}%`
		);
	}

	const { data: subcontractors, error } = await query;

	if (error) {
		console.error('Error fetching subcontractors:', error);
	}

	const canManageSubcontractors =
		membership.role === 'admin' || membership.role === 'foreman';

	return (
		<SubcontractorsClient
			subcontractors={subcontractors || []}
			canManageSubcontractors={canManageSubcontractors}
			search={search}
			includeArchived={includeArchived}
		/>
	);
}

