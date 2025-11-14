'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeForm } from '@/components/employees/employee-form';
import { useCreateEmployee } from '@/lib/hooks/use-employees';
import { type EmployeePayload } from '@/lib/schemas/employee';

export default function NewEmployeePage() {
	const router = useRouter();
	const createEmployee = useCreateEmployee();

	const handleSubmit = async (values: EmployeePayload) => {
		const newEmployee = await createEmployee.mutateAsync(values);
		router.push(`/dashboard/employees/${newEmployee.id}`);
	};

	return (
		<div className="flex-1 overflow-auto bg-gray-50 pb-20 transition-colors dark:bg-black md:pb-0">
			<div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
				<Card>
					<CardHeader>
						<CardTitle>Ny personal</CardTitle>
					</CardHeader>
					<CardContent>
						<EmployeeForm
							onSubmit={handleSubmit}
							onCancel={() => router.push('/dashboard/employees')}
							submitLabel="Skapa personal"
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

