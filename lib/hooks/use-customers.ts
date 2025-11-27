import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	type Customer,
	type CustomerPayload,
	type CustomerContact,
	type CustomerContactPayload,
} from '@/lib/schemas/customer';

type CustomerListParams = {
	query?: string;
	type?: 'COMPANY' | 'PRIVATE';
	includeArchived?: boolean;
	page?: number;
	pageSize?: number;
};

type CustomerListResponse = {
	items: Customer[];
	page: number;
	pageSize: number;
	total: number;
};

export type CustomerRelations = {
	project_count: number;
	contact_count: number;
	invoice_basis_count: number;
};

const fetchJson = async <T>(
	input: RequestInfo,
	init?: RequestInit
): Promise<T> => {
	const response = await fetch(input, {
		credentials: 'include',
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});

	if (!response.ok) {
		let errorBody: unknown = {};
		let errorText = '';
		
		try {
			// Clone the response before reading it to avoid consuming the body
			const clonedResponse = response.clone();
			errorText = await clonedResponse.text();
			
			if (errorText && errorText.trim().length > 0) {
				try {
					errorBody = JSON.parse(errorText);
				} catch (parseError) {
					// If JSON parsing fails, use the raw text as error message
					console.warn('[use-customers] Failed to parse error JSON:', parseError, 'Raw text:', errorText.substring(0, 200));
					errorBody = { error: errorText };
				}
			} else {
				// Empty response body - use status text
				errorBody = { error: `HTTP ${response.status} ${response.statusText}` };
			}
		} catch (readError) {
			// If reading response fails completely
			console.error('[use-customers] Failed to read error response:', readError);
			errorBody = { error: `HTTP ${response.status} ${response.statusText}` };
		}
		
		const errorData = errorBody as { 
			error?: string; 
			details?: unknown; 
			issues?: Array<{ path: string; message: string; code?: string }>;
			message?: string;
		};
		
		// Create a more detailed error message
		let message = errorData.error ?? errorData.message ?? `Serverfel (${response.status})`;
		
		// Add validation details if available
		if (errorData.issues && errorData.issues.length > 0) {
			// Format validation errors in a user-friendly way
			const fieldErrors = errorData.issues.map(i => {
				const fieldName = i.path.split('.').pop() || i.path;
				return `${fieldName}: ${i.message}`;
			});
			message = `${message}\n\n${fieldErrors.join('\n')}`;
		}
		
		// Create error object with structured data for better error handling
		const error = new Error(message) as Error & {
			status?: number;
			details?: unknown;
			issues?: Array<{ path: string; message: string; code?: string }>;
		};
		error.status = response.status;
		error.details = errorData.details;
		error.issues = errorData.issues;
		
		console.error('[use-customers] API error:', { 
			status: response.status, 
			statusText: response.statusText,
			errorBody: errorBody && typeof errorBody === 'object' && Object.keys(errorBody).length > 0 ? errorBody : { error: message },
			errorText: errorText ? errorText.substring(0, 500) : '(empty response body)',
			url: typeof input === 'string' ? input : (input as Request).url,
		});
		throw error;
	}

	return response.json() as Promise<T>;
};

const buildSearchParams = (params?: CustomerListParams) => {
	const searchParams = new URLSearchParams();

	if (!params) {
		return searchParams;
	}

	if (params.query) {
		searchParams.set('query', params.query);
	}
	if (params.type) {
		searchParams.set('type', params.type);
	}
	if (params.includeArchived) {
		searchParams.set('includeArchived', 'true');
	}
	if (params.page) {
		searchParams.set('page', params.page.toString());
	}
	if (params.pageSize) {
		searchParams.set('pageSize', params.pageSize.toString());
	}

	return searchParams;
};

export const useCustomers = (params?: CustomerListParams) => {
	const searchParams = useMemo(() => buildSearchParams(params), [params]);
	const queryString = searchParams.toString();
	const url = queryString ? `/api/customers?${queryString}` : '/api/customers';

	return useQuery({
		queryKey: ['customers', Object.fromEntries(searchParams)],
		queryFn: () => fetchJson<CustomerListResponse>(url),
		retry: (failureCount, error) =>
		error instanceof Error && /Unauthorized/.test(error.message)
			? false
			: failureCount < 3,
	});
};

export const useCustomer = (id: string | null) =>
	useQuery({
		enabled: Boolean(id),
		queryKey: ['customer', id],
		queryFn: () => fetchJson<Customer>(`/api/customers/${id}`),
	});

export const useCustomerWithRelations = (id: string | null) =>
	useQuery({
		enabled: Boolean(id),
		queryKey: ['customer', id, 'relations'],
		queryFn: () =>
			fetchJson<{ customer: Customer; relations: CustomerRelations }>(
				`/api/customers/${id}?withRelations=true`
			),
	});

export const useCustomerContacts = (customerId: string | null) =>
	useQuery({
		enabled: Boolean(customerId),
		queryKey: ['customer-contacts', customerId],
		queryFn: () =>
			fetchJson<CustomerContact[]>(`/api/customers/${customerId}/contacts`),
	});

export const useCreateCustomer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CustomerPayload) =>
			fetchJson<Customer>('/api/customers', {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: (customer) => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			queryClient.setQueryData(['customer', customer.id], customer);
		},
	});
};

export const useUpdateCustomer = (id: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CustomerPayload) =>
			fetchJson<Customer>(`/api/customers/${id}`, {
				method: 'PUT',
				body: JSON.stringify(payload),
			}),
		onSuccess: (customer) => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
			queryClient.setQueryData(['customer', id], customer);
			queryClient.invalidateQueries({ queryKey: ['customer', id, 'relations'] });
		},
	});
};

export const useCreateCustomerContact = (customerId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CustomerContactPayload) =>
			fetchJson<CustomerContact>(`/api/customers/${customerId}/contacts`, {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['customer-contacts', customerId],
			});
		},
	});
};

interface MergeCustomerPayload {
	duplicateId: string;
	overrides?: Partial<CustomerPayload>;
}

export const useMergeCustomer = (customerId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: MergeCustomerPayload) =>
			fetchJson<{ customer: Customer }>(`/api/customers/${customerId}/merge`, {
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
			queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'relations'] });
			queryClient.invalidateQueries({ queryKey: ['customer', variables.duplicateId] });
			queryClient.invalidateQueries({ queryKey: ['customer', variables.duplicateId, 'relations'] });
			queryClient.invalidateQueries({ queryKey: ['customers'] });
		},
	});
};

export const useDeleteCustomer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (customerId: string) =>
			fetchJson<{ message: string }>(`/api/customers/${customerId}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['customers'] });
		},
	});
};


