import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { SubcontractorCard } from '@/components/subcontractors/subcontractor-card';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function SubcontractorDetailPage(props: PageProps) {
	const params = await props.params;
	const subcontractorId = params.id;

	const { user } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="p-4 md:p-8">
				<SubcontractorCard subcontractorId={subcontractorId} />
			</div>
		</div>
	);
}

