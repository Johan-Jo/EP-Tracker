'use client';

import { useQuery } from '@tanstack/react-query';

export type PayrollBasisEntry = {
	id: string;
	person_id: string;
	period_start: string;
	period_end: string;
	hours_norm: number;
	hours_overtime: number;
	ob_hours: number;
	ob_hours_actual: number | null;
	ob_hours_multiplier: number | null;
	break_hours: number;
	total_hours: number;
	gross_salary_sek: number | null;
	locked: boolean;
	locked_by: string | null;
	locked_at: string | null;
	person: { id: string; full_name: string; email: string };
};

export function usePayrollBasis(orgId: string, start: string, end: string) {
	const query = useQuery<PayrollBasisEntry[]>({
		queryKey: ['payroll-basis', orgId, start, end],
		queryFn: async () => {
			const response = await fetch(`/api/payroll/basis?start=${start}&end=${end}`);
			if (!response.ok) {
				throw new Error(await response.text());
			}
			const data = await response.json();
			return data.payroll_basis || [];
		},
		staleTime: 30_000,
	});

	const refresh = async () => {
		const response = await fetch('/api/payroll/basis/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ start, end }),
		});
		const data = (await response.json().catch(() => ({}))) as any;
		if (!response.ok) {
			throw new Error(data?.error || data?.details || 'Kunde inte beräkna löneunderlag');
		}
		return data;
	};

	const lock = async (ids: string[], shouldLock: boolean) => {
		const response = await fetch('/api/payroll/basis/lock', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entry_ids: ids, lock: shouldLock }),
		});
		const data = (await response.json().catch(() => ({}))) as any;
		if (!response.ok) {
			throw new Error(data?.error || 'Kunde inte uppdatera låsstatus');
		}
		return data;
	};

	const exportFile = async (
		format: 'csv' | 'paxml' | 'pdf',
		scope: 'all' | 'locked' | 'selected',
		ids: string[] = [],
	) => {
		const params = new URLSearchParams({
			start,
			end,
			format,
			locked_only: String(scope === 'locked'),
			selected_ids: scope === 'selected' ? ids.join(',') : '',
		});
		const response = await fetch(`/api/payroll/basis/export?${params.toString()}`);
		if (!response.ok) {
			throw new Error(await response.text());
		}
		const blob = await response.blob();
		return blob;
	};

	return { ...query, refresh, lock, exportFile };
}


