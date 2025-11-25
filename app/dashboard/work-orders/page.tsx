import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { WorkOrdersClient } from './work-orders-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkOrdersPage(props: PageProps) {
	const searchParams = await props.searchParams;
	
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
							Du behöver vara medlem i en organisation för att se arbetsorder.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const supabase = await createClient();

	// Parse query parameters
	const start_date = typeof searchParams.start_date === 'string' ? searchParams.start_date : null;
	const end_date = typeof searchParams.end_date === 'string' ? searchParams.end_date : null;
	const status = typeof searchParams.status === 'string' ? searchParams.status : null;
	const project_id = typeof searchParams.project_id === 'string' ? searchParams.project_id : null;
	const customer_id = typeof searchParams.customer_id === 'string' ? searchParams.customer_id : null;
	const user_id = typeof searchParams.user_id === 'string' ? searchParams.user_id : null;

	// Build query with relations
	let query = supabase
		.from('work_orders')
		.select(`
			*,
			project:projects(id, name, project_number),
			customer:customers(id, type, company_name, first_name, last_name),
			assignments:work_order_assignments(
				id,
				user_id,
				role,
				is_responsible,
				assignment_status,
				user:profiles(id, full_name, email)
			),
			created_by:profiles!work_orders_created_by_id_fkey(id, full_name, email),
			closed_by:profiles!work_orders_closed_by_id_fkey(id, full_name, email)
		`)
		.eq('organization_id', membership.org_id)
		.order('planned_start_at', { ascending: true, nullsFirst: false })
		.order('created_at', { ascending: false })
		.limit(500);

	// Apply filters
	if (start_date) {
		query = query.gte('planned_start_at', start_date);
	}
	if (end_date) {
		query = query.lte('planned_start_at', `${end_date}T23:59:59`);
	}
	if (status) {
		query = query.eq('status', status);
	}
	if (project_id) {
		query = query.eq('project_id', project_id);
	}
	if (customer_id) {
		query = query.eq('customer_id', customer_id);
	}

	const { data: workOrders, error } = await query;

	if (error) {
		console.error('Error fetching work orders:', error);
	}

	// Filter by assigned user if specified (client-side filtering needed for nested relations)
	let filteredWorkOrders = workOrders || [];
	if (user_id && workOrders) {
		filteredWorkOrders = workOrders.filter((wo: any) => 
			wo.assignments?.some((a: any) => a.user_id === user_id)
		);
	}

	// Fetch projects, customers, and users for filters
	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, project_number')
		.eq('org_id', membership.org_id)
		.order('name')
		.limit(1000);

	const { data: customers } = await supabase
		.from('customers')
		.select('id, type, company_name, first_name, last_name')
		.eq('organization_id', membership.org_id)
		.order('company_name, first_name, last_name')
		.limit(1000);

	// Get all active members for assignment filtering
	const { data: memberships } = await supabase
		.from('memberships')
		.select(`
			user_id,
			user:profiles(id, full_name, email)
		`)
		.eq('org_id', membership.org_id)
		.eq('is_active', true);

	const users = (memberships || [])
		.map((m: any) => m.user)
		.filter(Boolean)
		.map((u: any) => ({
			id: u.id,
			full_name: u.full_name,
			email: u.email,
		}));

	const canEdit = membership.role === 'admin' || membership.role === 'foreman';

	return (
		<WorkOrdersClient
			initialWorkOrders={filteredWorkOrders as any}
			projects={(projects || []) as any}
			customers={(customers || []) as any}
			users={users}
			canEdit={canEdit}
			orgId={membership.org_id}
		/>
	);
}

