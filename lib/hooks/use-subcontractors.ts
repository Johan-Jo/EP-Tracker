'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	Subcontractor,
	SubcontractorPayload,
} from '@/lib/schemas/subcontractor';

type SubcontractorsListResponse = {
	items: Subcontractor[];
	page: number;
	pageSize: number;
	total: number;
};

type SubcontractorsListParams = {
	query?: string;
	page?: number;
	pageSize?: number;
	includeArchived?: boolean;
};

export function useSubcontractors(params: SubcontractorsListParams = {}) {
	const { query = '', page = 1, pageSize = 25, includeArchived = false } = params;

	return useQuery<SubcontractorsListResponse>({
		queryKey: ['subcontractors', { query, page, pageSize, includeArchived }],
		queryFn: async () => {
			const searchParams = new URLSearchParams({
				page: page.toString(),
				pageSize: pageSize.toString(),
				includeArchived: includeArchived.toString(),
			});

			if (query) {
				searchParams.set('query', query);
			}

			const response = await fetch(`/api/subcontractors?${searchParams.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to fetch subcontractors');
			}
			return response.json();
		},
	});
}

export function useSubcontractor(id: string) {
	return useQuery<Subcontractor>({
		queryKey: ['subcontractor', id],
		queryFn: async () => {
			const response = await fetch(`/api/subcontractors/${id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch subcontractor');
			}
			return response.json();
		},
		enabled: !!id,
	});
}

export function useCreateSubcontractor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: SubcontractorPayload) => {
			const response = await fetch('/api/subcontractors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create subcontractor');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
		},
	});
}

export function useUpdateSubcontractor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			payload,
		}: {
			id: string;
			payload: SubcontractorPayload;
		}) => {
			const response = await fetch(`/api/subcontractors/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update subcontractor');
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
			queryClient.invalidateQueries({ queryKey: ['subcontractor', data.id] });
		},
	});
}

