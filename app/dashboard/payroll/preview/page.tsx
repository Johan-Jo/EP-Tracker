import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { PayrollPreviewPage } from '@/components/payroll/payroll-preview-page';

interface PageProps {
	searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function PayrollPreviewPageRoute(props: PageProps) {
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

	// Only admin and foreman can view payroll preview
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		redirect('/dashboard');
	}

	const searchParams = await props.searchParams;

	return <PayrollPreviewPage orgId={membership.org_id} initialStart={searchParams.start} initialEnd={searchParams.end} />;
}

