import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { generateApprovalToken } from '@/lib/work-orders/generate-approval-token';
import { SupabaseClient } from '@supabase/supabase-js';

describe('generateApprovalToken', () => {
	let mockSupabase: jest.Mocked<SupabaseClient>;

	beforeEach(() => {
		mockSupabase = {
			rpc: jest.fn(),
		} as any;
	});

	it('should use database function if available', async () => {
		const expectedToken = 'db-generated-token-123';
		(mockSupabase.rpc as jest.Mock).mockResolvedValue({
			data: expectedToken,
			error: null,
		});

		const result = await generateApprovalToken(mockSupabase, 'work-order-id');

		expect(result).toBe(expectedToken);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_approval_token');
	});

	it('should fallback to client-side generation if database function fails', async () => {
		(mockSupabase.rpc as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'Function not found' },
		});

		const result = await generateApprovalToken(mockSupabase, 'work-order-id');

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
	});
});
