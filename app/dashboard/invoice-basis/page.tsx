import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { InvoiceBasisPage } from '@/components/invoice-basis/invoice-basis-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InvoiceBasisDashboardPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/dashboard');
	}

	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	const supabase = await createClient();
	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, project_number')
		.eq('org_id', membership.org_id)
		.order('name', { ascending: true });

	return (
		<InvoiceBasisPage
			orgId={membership.org_id}
			projects={projects?.map((project) => ({
				id: project.id,
				name: project.name,
				projectNumber: project.project_number,
			})) ?? []}
		/>
	);
}




