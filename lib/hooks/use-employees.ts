import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Employee, type EmployeePayload } from '@/lib/schemas/employee';

type EmployeesListResponse = {
	items: Employee[];
	page: number;
	pageSize: number;
	total: number;
};

type EmployeesListParams = {
	page?: number;
	pageSize?: number;
	query?: string;
	includeArchived?: boolean;
};

export function useEmployees(params: EmployeesListParams = {}) {
	const { page = 1, pageSize = 25, query = '', includeArchived = false } = params;

	const searchParams = new URLSearchParams({
		page: page.toString(),
		pageSize: pageSize.toString(),
		...(query && { query }),
		...(includeArchived && { includeArchived: 'true' }),
	});

	return useQuery<EmployeesListResponse>({
		queryKey: ['employees', page, pageSize, query, includeArchived],
		queryFn: async () => {
			const response = await fetch(`/api/employees?${searchParams.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to fetch employees');
			}
			return response.json();
		},
	});
}

export function useEmployee(id: string | null) {
	return useQuery<Employee>({
		queryKey: ['employee', id],
		queryFn: async () => {
			if (!id) throw new Error('Employee ID is required');
			const response = await fetch(`/api/employees/${id}`);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Personal hittades inte');
				}
				throw new Error('Failed to fetch employee');
			}
			return response.json();
		},
		enabled: !!id,
	});
}

export function useCreateEmployee() {
	const queryClient = useQueryClient();

	return useMutation<Employee, Error, EmployeePayload>({
		mutationFn: async (payload) => {
			const response = await fetch('/api/employees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create employee');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['employees'] });
		},
	});
}

export function useUpdateEmployee() {
	const queryClient = useQueryClient();

	return useMutation<Employee, Error, { id: string; payload: EmployeePayload }>({
		mutationFn: async ({ id, payload }) => {
			const response = await fetch(`/api/employees/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update employee');
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['employees'] });
			queryClient.invalidateQueries({ queryKey: ['employee', data.id] });
		},
	});
}

