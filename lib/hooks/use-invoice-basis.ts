import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InvoiceBasisLine, InvoiceTotals } from '@/lib/jobs/invoice-basis-refresh';
import { queryKeys } from '@/lib/query-keys';

export interface InvoiceBasisDiarySummary {
	date: string;
	raw: string;
	summary: string;
	line_ref: string;
}

export interface InvoiceBasisRecord {
	id: string;
	org_id: string;
	project_id: string;
	period_start: string;
	period_end: string;
	customer_id: string | null;
	customer_snapshot: Record<string, unknown> | null;
	invoice_series: string | null;
	invoice_number: string | null;
	invoice_date: string | null;
	due_date: string | null;
	payment_terms_days: number | null;
	ocr_ref: string | null;
	currency: string | null;
	fx_rate: number | null;
	our_ref: string | null;
	your_ref: string | null;
	reverse_charge_building: boolean;
	rot_rut_flag: boolean;
	worksite_address_json: Record<string, unknown> | null;
	worksite_id: string | null;
	invoice_address_json: Record<string, unknown> | null;
	delivery_address_json: Record<string, unknown> | null;
	cost_center: string | null;
	result_unit: string | null;
	lines_json: {
		lines: InvoiceBasisLine[];
		diary: InvoiceBasisDiarySummary[];
	};
	totals: InvoiceTotals | null;
	locked: boolean;
	locked_by: string | null;
	locked_at: string | null;
	hash_signature: string | null;
	created_at: string;
	updated_at: string;
}

const buildInvoiceBasisUrl = (projectId: string, periodStart: string, periodEnd: string) =>
	`/api/invoice-basis/${projectId}?periodStart=${periodStart}&periodEnd=${periodEnd}`;

interface UseInvoiceBasisParams {
	projectId?: string;
	periodStart?: string;
	periodEnd?: string;
	enabled?: boolean;
}

export function useInvoiceBasis({ projectId, periodStart, periodEnd, enabled = true }: UseInvoiceBasisParams) {
	return useQuery({
		queryKey:
			projectId && periodStart && periodEnd
				? queryKeys.invoiceBasis.detail(projectId, periodStart, periodEnd)
				: ['invoice-basis', 'disabled'],
		enabled: Boolean(enabled && projectId && periodStart && periodEnd),
		staleTime: 60 * 1000,
		queryFn: async (): Promise<InvoiceBasisRecord> => {
			if (!projectId || !periodStart || !periodEnd) {
				throw new Error('projectId, periodStart and periodEnd are required');
			}
			console.log(`[useInvoiceBasis] Fetching invoice basis for project ${projectId}, period ${periodStart} to ${periodEnd}`);
			const response = await fetch(buildInvoiceBasisUrl(projectId, periodStart, periodEnd));
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error(`[useInvoiceBasis] Failed to fetch invoice basis:`, errorData);
				throw new Error('Failed to fetch invoice basis');
			}
			const data = await response.json();
			const invoiceBasis = data.invoiceBasis as InvoiceBasisRecord;
			const linesCount = invoiceBasis?.lines_json?.lines?.length ?? 0;
			const lineTypes = (invoiceBasis?.lines_json?.lines ?? []).reduce((acc: Record<string, number>, line: any) => {
				acc[line.type] = (acc[line.type] || 0) + 1;
				return acc;
			}, {});
			console.log(`[useInvoiceBasis] Received invoice basis with ${linesCount} lines:`, lineTypes);
			return invoiceBasis;
		},
	});
}

interface UpdateInvoiceHeaderInput {
	projectId: string;
	periodStart: string;
	periodEnd: string;
	payload: Record<string, unknown>;
}

export function useUpdateInvoiceHeader() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, periodStart, periodEnd, payload }: UpdateInvoiceHeaderInput) => {
			const url = `/api/invoice-basis/${projectId}/header?periodStart=${periodStart}&periodEnd=${periodEnd}`;
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const message = await response.json().catch(() => ({ error: 'Failed to update invoice header' }));
				throw new Error(message.error || 'Failed to update invoice header');
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.invoiceBasis.detail(variables.projectId, variables.periodStart, variables.periodEnd),
			});
		},
	});
}

interface UpdateInvoiceLineInput {
	projectId: string;
	lineId: string;
	periodStart: string;
	periodEnd: string;
	payload: Record<string, unknown>;
}

export function useUpdateInvoiceLine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, lineId, periodStart, periodEnd, payload }: UpdateInvoiceLineInput) => {
			const url = `/api/invoice-basis/${projectId}/lines/${lineId}?periodStart=${periodStart}&periodEnd=${periodEnd}`;
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const message = await response.json().catch(() => ({ error: 'Failed to update invoice line' }));
				throw new Error(message.error || 'Failed to update invoice line');
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.invoiceBasis.detail(variables.projectId, variables.periodStart, variables.periodEnd),
			});
		},
	});
}

interface LockInvoiceBasisInput {
	projectId: string;
	periodStart: string;
	periodEnd: string;
	payload?: Record<string, unknown>;
}

export function useLockInvoiceBasis() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, periodStart, periodEnd, payload = {} }: LockInvoiceBasisInput) => {
			const response = await fetch(`/api/invoice-basis/${projectId}/lock`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ periodStart, periodEnd, ...payload }),
			});
			if (!response.ok) {
				const message = await response.json().catch(() => ({ error: 'Failed to lock invoice basis' }));
				throw new Error(message.error || 'Failed to lock invoice basis');
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.invoiceBasis.detail(variables.projectId, variables.periodStart, variables.periodEnd),
			});
		},
	});
}

interface UnlockInvoiceBasisInput {
	projectId: string;
	periodStart: string;
	periodEnd: string;
	reason: string;
}

export function useUnlockInvoiceBasis() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectId, periodStart, periodEnd, reason }: UnlockInvoiceBasisInput) => {
			const response = await fetch(`/api/invoice-basis/${projectId}/unlock`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ periodStart, periodEnd, reason }),
			});
			if (!response.ok) {
				const message = await response.json().catch(() => ({ error: 'Failed to unlock invoice basis' }));
				throw new Error(message.error || 'Failed to unlock invoice basis');
			}
			return response.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.invoiceBasis.detail(variables.projectId, variables.periodStart, variables.periodEnd),
			});
		},
	});
}


