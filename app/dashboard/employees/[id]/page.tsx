import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { EmployeeCard } from '@/components/employees/employee-card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function EmployeePage(props: PageProps) {
	const params = await props.params;
	const employeeId = params.id;

	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		notFound();
	}

	const supabase = await createClient();
	const { data: employee, error } = await supabase
		.from('employees')
		.select('*')
		.eq('id', employeeId)
		.eq('org_id', membership.org_id)
		.single();

	if (error || !employee) {
		notFound();
	}

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
				<EmployeeCard employeeId={employeeId} />
			</div>
		</div>
	);
}

