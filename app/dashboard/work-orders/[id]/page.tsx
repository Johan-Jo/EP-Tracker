import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { WorkOrderDetailClient } from './work-order-detail-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage(props: PageProps) {
	const params = await props.params;
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		notFound();
	}

	const supabase = await createClient();

	// Fetch work order with all relations
	const { data: workOrder, error } = await supabase
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
		.eq('id', params.id)
		.eq('organization_id', membership.org_id)
		.single();

	if (error || !workOrder) {
		console.error('Error fetching work order:', error);
		notFound();
	}

	// Check permissions
	const canEdit =
		['admin', 'foreman'].includes(membership.role) ||
		workOrder.assignments?.some((a: any) => a.user_id === user.id);

	// Fetch time entries for this work order
	const { data: timeEntries } = await supabase
		.from('time_entries')
		.select(`
			id,
			user_id,
			start_at,
			stop_at,
			duration_min,
			task_label,
			notes,
			user:profiles(id, full_name, email)
		`)
		.eq('work_order_id', params.id)
		.order('start_at', { ascending: false })
		.limit(100);

	// Fetch diary entries for this work order
	const { data: diaryEntries } = await supabase
		.from('diary_entries')
		.select(`
			id,
			date,
			work_performed,
			created_by,
			created_at,
			created_by_user:profiles(id, full_name)
		`)
		.eq('work_order_id', params.id)
		.order('date', { ascending: false })
		.limit(50);

	// Fetch projects and customers for edit forms
	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, project_number')
		.eq('org_id', membership.org_id)
		.eq('status', 'active')
		.order('name');

	const { data: customers } = await supabase
		.from('customers')
		.select('id, type, company_name, first_name, last_name')
		.eq('org_id', membership.org_id)
		.order('company_name', { nullsFirst: false })
		.order('last_name', { nullsFirst: false });

	// Fetch users for assignment
	const { data: memberships } = await supabase
		.from('memberships')
		.select(`
			user_id,
			user:profiles(id, full_name, email)
		`)
		.eq('org_id', membership.org_id)
		.eq('is_active', true);

	return (
		<WorkOrderDetailClient
			workOrder={workOrder}
			timeEntries={timeEntries || []}
			diaryEntries={diaryEntries || []}
			projects={projects || []}
			customers={customers || []}
			users={
				memberships?.map((m) => ({
					id: m.user_id,
					full_name: m.user?.full_name,
					email: m.user?.email,
				})) || []
			}
			canEdit={canEdit}
		/>
	);
}

