import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { PayrollBasisPage } from '@/components/payroll/payroll-basis-page';

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

	return <PayrollBasisPage orgId={membership.org_id} />;
}

