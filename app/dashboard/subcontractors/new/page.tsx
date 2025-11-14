'use client';

import { useRouter } from 'next/navigation';
import { SubcontractorForm } from '@/components/subcontractors/subcontractor-form';
import { useCreateSubcontractor } from '@/lib/hooks/use-subcontractors';
import { type SubcontractorPayload } from '@/lib/schemas/subcontractor';

export default function NewSubcontractorPage() {
	const router = useRouter();
	const createSubcontractor = useCreateSubcontractor();

	const handleSubmit = async (payload: SubcontractorPayload) => {
		const newSubcontractor = await createSubcontractor.mutateAsync(payload);
		router.push(`/dashboard/subcontractors/${newSubcontractor.id}`);
	};

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="p-4 md:p-8">
				<div className="mx-auto max-w-4xl">
					<h1 className="mb-6 text-3xl font-bold">Ny underentreprenör</h1>
					<SubcontractorForm onSubmit={handleSubmit} />
				</div>
			</div>
		</div>
	);
}

