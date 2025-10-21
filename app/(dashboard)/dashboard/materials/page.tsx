import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { MaterialsPageClient } from '@/components/materials/materials-page-client';

export default async function MaterialsPage() {
	// Server-side: Only fetch session
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

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Material & Kostnader</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Registrera material, utlägg och milersättning
				</p>
			</div>

			{/* Client component with lazy-loaded tabs */}
			<MaterialsPageClient orgId={membership.org_id} />
		</div>
	);
}
