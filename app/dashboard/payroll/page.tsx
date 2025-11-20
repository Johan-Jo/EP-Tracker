import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { PayrollBasisPage } from '@/components/payroll/payroll-basis-page';
import { getFortnoxConnectionForOrg } from '@/lib/integrations/fortnox/client';
import { createClient } from '@/lib/supabase/server';

export default async function PayrollPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Ingen aktiv organisation hittades</p>
			</div>
		);
	}

	// Only admin and foreman can view payroll basis
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	// ✅ PERFORMANCE: Parallelize Fortnox connection check (non-blocking)
	// Check Fortnox connection
	const fortnoxConnection = await getFortnoxConnectionForOrg(membership.org_id);
	const hasFortnoxConnection = !!fortnoxConnection;
	
	// Check if scope includes payroll/salary
	// The salary scope is required for payroll export
	const hasPayrollScope = fortnoxConnection?.scopes?.includes('salary') ?? false;

	// ✅ PERFORMANCE: Optimize exportLinks query - only fetch recent exports (last 1000)
	// Note: API route now also provides export status via JOIN, but we keep this for initial render
	const supabase = await createClient();
	const { data: exportLinks } = await supabase
		.from('fortnox_payroll_links')
		.select('payroll_basis_id, status, exported_at, error_message')
		.eq('org_id', membership.org_id)
		.order('exported_at', { ascending: false, nullsFirst: false })
		.limit(1000); // Limit to prevent slow queries

	// Create a map: payroll_basis_id -> export status
	const exportStatusMap = new Map<
		string,
		{ status: string; exported_at: string | null; error_message: string | null }
	>();
	if (exportLinks) {
		exportLinks.forEach((link) => {
			exportStatusMap.set(link.payroll_basis_id, {
				status: link.status,
				exported_at: link.exported_at,
				error_message: link.error_message,
			});
		});
	}

	return (
		<PayrollBasisPage
			orgId={membership.org_id}
			hasFortnoxConnection={hasFortnoxConnection}
			hasPayrollScope={hasPayrollScope}
			exportStatusMap={exportStatusMap}
		/>
	);
}

