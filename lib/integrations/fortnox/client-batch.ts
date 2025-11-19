import type { FortnoxConnection } from './client';
import { createFortnoxSalaryTransaction, createFortnoxAttendanceTransaction } from './client';
import type { FortnoxPayrollBatchResult } from './types';

/**
 * Create multiple salary transactions in Fortnox Payroll
 * Posts transactions sequentially and collects results
 * @param connection Fortnox connection (will be refreshed if needed)
 * @param payloads Array of salary transaction payloads
 * @returns Batch result with success/failure counts and per-transaction results
 */
export async function createFortnoxSalaryTransactionsBatch(
	connection: FortnoxConnection,
	payloads: unknown[]
): Promise<FortnoxPayrollBatchResult> {
	const results: Array<{
		index: number;
		success: boolean;
		transactionId?: number | string;
		error?: string;
	}> = [];

	let successCount = 0;
	let failureCount = 0;

	for (let i = 0; i < payloads.length; i++) {
		const payload = payloads[i];
		try {
			const response = await createFortnoxSalaryTransaction(connection, payload);
			const salaryResponse = response as { SalaryTransaction?: { SalaryRow?: number } };
			const salaryRow = salaryResponse.SalaryTransaction?.SalaryRow;

			results.push({
				index: i,
				success: true,
				transactionId: salaryRow,
			});
			successCount++;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			results.push({
				index: i,
				success: false,
				error: errorMessage,
			});
			failureCount++;
		}
	}

	return {
		successCount,
		failureCount,
		results,
	};
}

/**
 * Create multiple attendance transactions in Fortnox Payroll
 * Posts transactions sequentially and collects results
 * @param connection Fortnox connection (will be refreshed if needed)
 * @param payloads Array of attendance transaction payloads
 * @returns Batch result with success/failure counts and per-transaction results
 */
export async function createFortnoxAttendanceTransactionsBatch(
	connection: FortnoxConnection,
	payloads: unknown[]
): Promise<FortnoxPayrollBatchResult> {
	const results: Array<{
		index: number;
		success: boolean;
		transactionId?: number | string;
		error?: string;
	}> = [];

	let successCount = 0;
	let failureCount = 0;

	for (let i = 0; i < payloads.length; i++) {
		const payload = payloads[i];
		try {
			const response = await createFortnoxAttendanceTransaction(connection, payload);
			const attendanceResponse = response as { AttendanceTransaction?: { id?: string } };
			const transactionId = attendanceResponse.AttendanceTransaction?.id;

			results.push({
				index: i,
				success: true,
				transactionId: transactionId,
			});
			successCount++;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			results.push({
				index: i,
				success: false,
				error: errorMessage,
			});
			failureCount++;
		}
	}

	return {
		successCount,
		failureCount,
		results,
	};
}

