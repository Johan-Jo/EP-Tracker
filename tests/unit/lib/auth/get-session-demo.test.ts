import { getSession } from '@/lib/auth/get-session';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/demo/get-demo-org');
jest.mock('next/headers');

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedGetDemoOrgId = getDemoOrgId as jest.MockedFunction<typeof getDemoOrgId>;
const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('getSession with demo mode support', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns normal membership when example mode not enabled', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedCreateClient.mockResolvedValue({
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-1' } },
					error: null,
				}),
			},
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { org_id: userOrgId, role: 'admin', hourly_rate_sek: 400 },
					error: null,
				}),
			}),
		} as any);

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null), // No example mode cookie
		} as any);

		const result = await getSession();

		expect(result.membership?.org_id).toBe(userOrgId);
		expect(mockedGetDemoOrgId).not.toHaveBeenCalled(); // Should not check demo org if cookie not set
	});

	test('returns demo org membership when example mode enabled', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedCreateClient.mockResolvedValue({
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-1' } },
					error: null,
				}),
			},
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { org_id: userOrgId, role: 'admin', hourly_rate_sek: 400 },
					error: null,
				}),
			}),
		} as any);

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue({ value: 'true' }), // Example mode enabled
		} as any);

		const result = await getSession();

		expect(result.membership?.org_id).toBe(demoOrgId);
		expect(result.membership?.role).toBe('admin'); // Role should be preserved
		expect(mockedGetDemoOrgId).toHaveBeenCalled();
	});

	test('handles cookie errors gracefully', async () => {
		const userOrgId = 'user-org-123';

		mockedCreateClient.mockResolvedValue({
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: { id: 'user-1' } },
					error: null,
				}),
			},
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { org_id: userOrgId, role: 'admin', hourly_rate_sek: 400 },
					error: null,
				}),
			}),
		} as any);

		mockedCookies.mockRejectedValue(new Error('Cookie error'));

		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
		const result = await getSession();

		// Should still return normal membership despite cookie error
		expect(result.membership?.org_id).toBe(userOrgId);
		consoleSpy.mockRestore();
	});

	test('returns null when user not authenticated', async () => {
		mockedCreateClient.mockResolvedValue({
			auth: {
				getUser: jest.fn().mockResolvedValue({
					data: { user: null },
					error: { message: 'Not authenticated' },
				}),
			},
		} as any);

		const result = await getSession();

		expect(result.user).toBeNull();
		expect(result.membership).toBeNull();
		expect(result.profile).toBeNull();
	});
});

