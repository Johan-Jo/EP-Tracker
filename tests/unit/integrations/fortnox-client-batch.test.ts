/**
 * Unit tests for Fortnox payroll batch operations
 * Tests batch creation of salary and attendance transactions
 */

import type { FortnoxConnection } from '@/lib/integrations/fortnox/client';
import type {
	FortnoxSalaryTransactionPayload,
	FortnoxAttendanceTransactionPayload,
} from '@/lib/integrations/fortnox/types';

// Mock the client functions
jest.mock('@/lib/integrations/fortnox/client', () => ({
	createFortnoxSalaryTransaction: jest.fn(),
	createFortnoxAttendanceTransaction: jest.fn(),
	refreshAccessTokenIfNeeded: jest.fn((conn) => Promise.resolve(conn)),
}));

describe('Fortnox Payroll Batch Operations', () => {
	const mockConnection: FortnoxConnection = {
		id: 'conn-1',
		org_id: 'org-1',
		access_token: 'token-123',
		refresh_token: 'refresh-123',
		access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
		scopes: 'salary',
		fortnox_customer_number: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	const mockSalaryPayload: FortnoxSalaryTransactionPayload = {
		EmployeeId: '101',
		Date: '2025-01-15',
		SalaryCode: '100',
		Amount: '5000.00',
	};

	const mockAttendancePayload: FortnoxAttendanceTransactionPayload = {
		EmployeeId: '101',
		Date: '2025-01-15',
		CauseCode: 'ARB',
		Hours: '8.0',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createFortnoxSalaryTransactionsBatch', () => {
		it('should successfully create multiple salary transactions', async () => {
			const { createFortnoxSalaryTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxSalaryTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxSalaryTransaction
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 123 },
				})
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 124 },
				});

			const payloads = [mockSalaryPayload, { ...mockSalaryPayload, Amount: '6000.00' }];

			const result = await createFortnoxSalaryTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(0);
			expect(result.results).toHaveLength(2);
			expect(result.results[0]?.success).toBe(true);
			expect(result.results[0]?.transactionId).toBe(123);
			expect(result.results[1]?.success).toBe(true);
			expect(result.results[1]?.transactionId).toBe(124);
		});

		it('should handle partial failures', async () => {
			const { createFortnoxSalaryTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxSalaryTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxSalaryTransaction
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 123 },
				})
				.mockRejectedValueOnce(new Error('Invalid EmployeeId'))
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 125 },
				});

			const payloads = [
				mockSalaryPayload,
				{ ...mockSalaryPayload, EmployeeId: 'invalid' },
				mockSalaryPayload,
			];

			const result = await createFortnoxSalaryTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(1);
			expect(result.results).toHaveLength(3);
			expect(result.results[0]?.success).toBe(true);
			expect(result.results[1]?.success).toBe(false);
			expect(result.results[1]?.error).toContain('Invalid EmployeeId');
			expect(result.results[2]?.success).toBe(true);
		});

		it('should handle all failures', async () => {
			const { createFortnoxSalaryTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxSalaryTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxSalaryTransaction.mockRejectedValue(new Error('API Error'));

			const payloads = [mockSalaryPayload, mockSalaryPayload];

			const result = await createFortnoxSalaryTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(0);
			expect(result.failureCount).toBe(2);
			expect(result.results).toHaveLength(2);
			expect(result.results.every((r) => !r.success)).toBe(true);
		});

		it('should handle empty payload array', async () => {
			const { createFortnoxSalaryTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			const result = await createFortnoxSalaryTransactionsBatch(mockConnection, []);

			expect(result.successCount).toBe(0);
			expect(result.failureCount).toBe(0);
			expect(result.results).toHaveLength(0);
		});

		it('should preserve transaction order in results', async () => {
			const { createFortnoxSalaryTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxSalaryTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxSalaryTransaction
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 100 },
				})
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 101 },
				})
				.mockResolvedValueOnce({
					SalaryTransaction: { SalaryRow: 102 },
				});

			const payloads = [mockSalaryPayload, mockSalaryPayload, mockSalaryPayload];

			const result = await createFortnoxSalaryTransactionsBatch(mockConnection, payloads);

			expect(result.results[0]?.index).toBe(0);
			expect(result.results[1]?.index).toBe(1);
			expect(result.results[2]?.index).toBe(2);
		});
	});

	describe('createFortnoxAttendanceTransactionsBatch', () => {
		it('should successfully create multiple attendance transactions', async () => {
			const { createFortnoxAttendanceTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxAttendanceTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxAttendanceTransaction
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-1' },
				})
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-2' },
				});

			const payloads = [mockAttendancePayload, { ...mockAttendancePayload, Date: '2025-01-16' }];

			const result = await createFortnoxAttendanceTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(0);
			expect(result.results).toHaveLength(2);
			expect(result.results[0]?.success).toBe(true);
			expect(result.results[0]?.transactionId).toBe('uuid-1');
			expect(result.results[1]?.success).toBe(true);
			expect(result.results[1]?.transactionId).toBe('uuid-2');
		});

		it('should handle partial failures', async () => {
			const { createFortnoxAttendanceTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxAttendanceTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxAttendanceTransaction
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-1' },
				})
				.mockRejectedValueOnce(new Error('Invalid CauseCode'))
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-3' },
				});

			const payloads = [
				mockAttendancePayload,
				{ ...mockAttendancePayload, CauseCode: 'INVALID' as any },
				mockAttendancePayload,
			];

			const result = await createFortnoxAttendanceTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(2);
			expect(result.failureCount).toBe(1);
			expect(result.results).toHaveLength(3);
			expect(result.results[0]?.success).toBe(true);
			expect(result.results[1]?.success).toBe(false);
			expect(result.results[1]?.error).toContain('Invalid CauseCode');
			expect(result.results[2]?.success).toBe(true);
		});

		it('should handle all failures', async () => {
			const { createFortnoxAttendanceTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxAttendanceTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxAttendanceTransaction.mockRejectedValue(new Error('Network Error'));

			const payloads = [mockAttendancePayload, mockAttendancePayload];

			const result = await createFortnoxAttendanceTransactionsBatch(mockConnection, payloads);

			expect(result.successCount).toBe(0);
			expect(result.failureCount).toBe(2);
			expect(result.results).toHaveLength(2);
			expect(result.results.every((r) => !r.success)).toBe(true);
		});

		it('should handle empty payload array', async () => {
			const { createFortnoxAttendanceTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			const result = await createFortnoxAttendanceTransactionsBatch(mockConnection, []);

			expect(result.successCount).toBe(0);
			expect(result.failureCount).toBe(0);
			expect(result.results).toHaveLength(0);
		});

		it('should preserve transaction order in results', async () => {
			const { createFortnoxAttendanceTransaction } = require('@/lib/integrations/fortnox/client');
			const { createFortnoxAttendanceTransactionsBatch } = require('@/lib/integrations/fortnox/client-batch');

			createFortnoxAttendanceTransaction
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-1' },
				})
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-2' },
				})
				.mockResolvedValueOnce({
					AttendanceTransaction: { id: 'uuid-3' },
				});

			const payloads = [mockAttendancePayload, mockAttendancePayload, mockAttendancePayload];

			const result = await createFortnoxAttendanceTransactionsBatch(mockConnection, payloads);

			expect(result.results[0]?.index).toBe(0);
			expect(result.results[1]?.index).toBe(1);
			expect(result.results[2]?.index).toBe(2);
		});
	});
});

