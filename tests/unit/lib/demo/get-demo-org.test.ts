import { getDemoOrgId, clearDemoOrgCache } from '@/lib/demo/get-demo-org';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('getDemoOrgId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		clearDemoOrgCache();
	});

	afterEach(() => {
		clearDemoOrgCache();
	});

	test('returns demo org ID when found', async () => {
		const demoOrgId = 'demo-org-id-123';
		
		mockedCreateClient.mockResolvedValue({
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: demoOrgId },
					error: null,
				}),
			}),
		} as any);

		const result = await getDemoOrgId();

		expect(result).toBe(demoOrgId);
		expect(mockedCreateClient).toHaveBeenCalledTimes(1);
	});

	test('returns null when demo org not found', async () => {
		mockedCreateClient.mockResolvedValue({
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116', message: 'No rows returned' },
				}),
			}),
		} as any);

		const result = await getDemoOrgId();

		expect(result).toBeNull();
	});

	test('caches result on subsequent calls', async () => {
		const demoOrgId = 'demo-org-id-123';
		
		mockedCreateClient.mockResolvedValue({
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: demoOrgId },
					error: null,
				}),
			}),
		} as any);

		// First call
		const result1 = await getDemoOrgId();
		expect(result1).toBe(demoOrgId);
		expect(mockedCreateClient).toHaveBeenCalledTimes(1);

		// Second call - should use cache
		const result2 = await getDemoOrgId();
		expect(result2).toBe(demoOrgId);
		expect(mockedCreateClient).toHaveBeenCalledTimes(1); // Still 1, not 2
	});

	test('clears cache when clearDemoOrgCache is called', async () => {
		const demoOrgId = 'demo-org-id-123';
		
		mockedCreateClient.mockResolvedValue({
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: demoOrgId },
					error: null,
				}),
			}),
		} as any);

		// First call
		await getDemoOrgId();
		expect(mockedCreateClient).toHaveBeenCalledTimes(1);

		// Clear cache
		clearDemoOrgCache();

		// Second call - should query again
		await getDemoOrgId();
		expect(mockedCreateClient).toHaveBeenCalledTimes(2);
	});

	test('handles database errors gracefully', async () => {
		mockedCreateClient.mockResolvedValue({
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: '500', message: 'Database error' },
				}),
			}),
		} as any);

		const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
		const result = await getDemoOrgId();

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('[DEMO]'),
			expect.anything()
		);
		consoleSpy.mockRestore();
	});
});

