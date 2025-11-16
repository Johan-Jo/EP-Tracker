import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { InvoiceBasisPageClient } from '@/components/invoice-basis/invoice-basis-page-client';

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

	// Allow admin, foreman, and finance roles
	if (membership.role !== 'admin' && membership.role !== 'foreman' && membership.role !== 'finance') {
		redirect('/dashboard');
	}

	const supabase = await createClient();
	
	// Check if onboarding is completed
	const { data: organization } = await supabase
		.from('organizations')
		.select('invoice_onboarding_completed_at')
		.eq('id', membership.org_id)
		.single();

	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, project_number')
		.eq('org_id', membership.org_id)
		.order('name', { ascending: true });

	return (
		<InvoiceBasisPageClient
			orgId={membership.org_id}
			projects={projects?.map((project) => ({
				id: project.id,
				name: project.name,
				projectNumber: project.project_number,
			})) ?? []}
			userRole={membership.role}
			onboardingCompleted={!!organization?.invoice_onboarding_completed_at}
		/>
	);
}






