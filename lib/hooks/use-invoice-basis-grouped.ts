import { useQuery } from '@tanstack/react-query';

export interface InvoiceBasisEntry {
	id: string;
	project_id: string;
	status: string;
	approved_by?: string | null;
	approved_at?: string | null;
	project?: {
		id: string;
		name: string;
		project_number?: string | null;
	};
	user?: {
		id: string;
		full_name?: string | null;
	};
	[key: string]: unknown;
}

export interface InvoiceBasisGrouped {
	approved: {
		time: InvoiceBasisEntry[];
		material: InvoiceBasisEntry[];
		expense: InvoiceBasisEntry[];
		mileage: InvoiceBasisEntry[];
		ata: InvoiceBasisEntry[];
	};
	pending: {
		time: InvoiceBasisEntry[];
		material: InvoiceBasisEntry[];
		expense: InvoiceBasisEntry[];
		mileage: InvoiceBasisEntry[];
		ata: InvoiceBasisEntry[];
	};
}

interface UseInvoiceBasisGroupedParams {
	projectIds?: string[];
	from?: string;
	to?: string;
	enabled?: boolean;
}

/**
 * React hook to fetch invoice basis data grouped by approved/pending and type
 */
export function useInvoiceBasisGrouped({
	projectIds,
	from,
	to,
	enabled = true,
}: UseInvoiceBasisGroupedParams) {
	return useQuery({
		queryKey: projectIds && from && to
			? ['invoice-basis-grouped', projectIds.sort().join(','), from, to]
			: ['invoice-basis-grouped', 'disabled'],
		enabled: Boolean(enabled && projectIds && projectIds.length > 0 && from && to),
		staleTime: 30 * 1000, // 30 seconds
		queryFn: async (): Promise<InvoiceBasisGrouped> => {
			if (!projectIds || projectIds.length === 0 || !from || !to) {
				throw new Error('projectIds, from and to are required');
			}

			const response = await fetch('/api/invoice/basis', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectIds,
					from,
					to,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to fetch invoice basis');
			}

			return response.json();
		},
	});
}

