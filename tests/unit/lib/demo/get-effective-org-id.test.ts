import { getEffectiveOrgId } from '@/lib/demo/get-effective-org-id';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';

jest.mock('@/lib/demo/get-demo-org');

const mockedGetDemoOrgId = getDemoOrgId as jest.MockedFunction<typeof getDemoOrgId>;

describe('getEffectiveOrgId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns user org ID when demoMode is none', async () => {
		const userOrgId = 'user-org-123';

		const result = await getEffectiveOrgId(userOrgId, 'none');

		expect(result).toBe(userOrgId);
		expect(mockedGetDemoOrgId).not.toHaveBeenCalled();
	});

	test('returns demo org ID when demoMode is anonymous', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);

		const result = await getEffectiveOrgId(userOrgId, 'anonymous');

		expect(result).toBe(demoOrgId);
		expect(mockedGetDemoOrgId).toHaveBeenCalledTimes(1);
	});

	test('returns demo org ID when demoMode is exampleOrg', async () => {
		const userOrgId = 'user-org-123';
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);

		const result = await getEffectiveOrgId(userOrgId, 'exampleOrg');

		expect(result).toBe(demoOrgId);
		expect(mockedGetDemoOrgId).toHaveBeenCalledTimes(1);
	});

	test('returns null when demoMode is anonymous but demo org not found', async () => {
		const userOrgId = 'user-org-123';

		mockedGetDemoOrgId.mockResolvedValue(null);

		const result = await getEffectiveOrgId(userOrgId, 'anonymous');

		expect(result).toBeNull();
	});

	test('handles null userOrgId', async () => {
		const demoOrgId = 'demo-org-456';

		mockedGetDemoOrgId.mockResolvedValue(demoOrgId);

		const result = await getEffectiveOrgId(null, 'anonymous');

		expect(result).toBe(demoOrgId);
	});
});

