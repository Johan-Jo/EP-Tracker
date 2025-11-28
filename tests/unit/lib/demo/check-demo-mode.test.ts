import { checkDemoMode } from '@/lib/demo/check-demo-mode';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';
import { cookies } from 'next/headers';

jest.mock('@/lib/demo/get-demo-org');
jest.mock('next/headers');

const mockedGetDemoOrgId = getDemoOrgId as jest.MockedFunction<typeof getDemoOrgId>;
const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('checkDemoMode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns isDemoMode=false when not in example mode and org is not demo', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null),
		} as any);

		const result = await checkDemoMode(userOrgId);

		expect(result.isDemoMode).toBe(false);
		expect(result.demoOrgId).toBe(demoOrgId);
		expect(result.effectiveOrgId).toBe(userOrgId);
	});

	test('returns isDemoMode=true when example mode cookie is set', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue({ value: 'true' }),
		} as any);

		const result = await checkDemoMode(userOrgId);

		expect(result.isDemoMode).toBe(true);
		expect(result.demoOrgId).toBe(demoOrgId);
		expect(result.effectiveOrgId).toBe(demoOrgId);
	});

	test('returns isDemoMode=true when user org is demo org', async () => {
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null),
		} as any);

		const result = await checkDemoMode(demoOrgId);

		expect(result.isDemoMode).toBe(true);
		expect(result.demoOrgId).toBe(demoOrgId);
		expect(result.effectiveOrgId).toBe(demoOrgId);
	});

	test('returns isDemoMode=true when both example mode and user org is demo', async () => {
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue({ value: 'true' }),
		} as any);

		const result = await checkDemoMode(demoOrgId);

		expect(result.isDemoMode).toBe(true);
		expect(result.demoOrgId).toBe(demoOrgId);
		expect(result.effectiveOrgId).toBe(demoOrgId);
	});

	test('handles null userOrgId', async () => {
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null),
		} as any);

		const result = await checkDemoMode(null);

		expect(result.isDemoMode).toBe(false);
		expect(result.effectiveOrgId).toBeNull();
	});

	test('handles null demoOrgId', async () => {
		const userOrgId = 'user-org-123';

		mockedGetDemoOrgId.mockResolvedValue(null);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null),
		} as any);

		const result = await checkDemoMode(userOrgId);

		expect(result.isDemoMode).toBe(false);
		expect(result.demoOrgId).toBeNull();
		expect(result.effectiveOrgId).toBe(userOrgId);
	});

	test('handles null userOrgId with demo org', async () => {
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);
		mockedCookies.mockResolvedValue({
			get: jest.fn().mockReturnValue(null),
		} as any);

		const result = await checkDemoMode(null);

		expect(result.isDemoMode).toBe(false);
		expect(result.effectiveOrgId).toBeNull();
	});
});

