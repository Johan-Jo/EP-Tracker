import { NextRequest } from 'next/server';
import { POST as approveTime } from '@/app/api/work-orders/[id]/approve-time/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { sendWorkOrderManagerApprovalEmail } from '@/lib/work-orders/send-manager-approval-email';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/work-orders/send-manager-approval-email');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedSendManagerApprovalEmail = sendWorkOrderManagerApprovalEmail as jest.MockedFunction<typeof sendWorkOrderManagerApprovalEmail>;

describe('POST /api/work-orders/[id]/approve-time', () => {
	const validWorkOrderId = '123e4567-e89b-12d3-a456-426614174010';
	const validOrgId = '123e4567-e89b-12d3-a456-426614174001';
	const validUserId = '123e4567-e89b-12d3-a456-426614174004';
	const validToken = 'test-approval-token-123';

	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: validUserId },
			membership: { org_id: validOrgId, role: 'worker' },
		} as any);
		mockedCreateClient.mockReset();
		mockedSendManagerApprovalEmail.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should approve time for work order', async () => {
		const workOrder = {
			id: validWorkOrderId,
			organization_id: validOrgId,
			actual_time_approval_token: validToken,
			actual_time_worker_confirmed_at: null,
		};

		const checkBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: workOrder,
				error: null,
			}),
		};

		const updateBuilder: any = {
			update: jest.fn(function(data: any) {
				updateBuilder._updateData = data;
				return updateBuilder;
			}),
			eq: jest.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: (table: string) => {
				if (table === 'work_orders') {
					return {
						select: () => checkBuilder,
						update: (data: any) => updateBuilder.update(data),
					};
				}
				return {};
			},
		} as any);

		const request = new NextRequest(
			`http://localhost/api/work-orders/${validWorkOrderId}/approve-time?token=${validToken}`
		);

		const response = await approveTime(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.success).toBe(true);
		expect(mockedSendManagerApprovalEmail).toHaveBeenCalled();
	});

	it('should return 400 if token is missing', async () => {
		const request = new NextRequest(`http://localhost/api/work-orders/${validWorkOrderId}/approve-time`);

		const response = await approveTime(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(400);
		expect(payload.error).toBe('Missing token');
	});

	it('should return 400 if token is invalid', async () => {
		const checkBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' },
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => ({ select: () => checkBuilder }),
		} as any);

		const request = new NextRequest(
			`http://localhost/api/work-orders/${validWorkOrderId}/approve-time?token=invalid-token`
		);

		const response = await approveTime(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(400);
		expect(payload.error).toBe('Invalid or expired token');
	});

	it('should return 401 if not authenticated', async () => {
		mockedGetSession.mockResolvedValueOnce({
			user: null,
			membership: null,
		} as any);

		const request = new NextRequest(
			`http://localhost/api/work-orders/${validWorkOrderId}/approve-time?token=${validToken}`
		);

		const response = await approveTime(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(401);
		expect(payload.error).toBe('Unauthorized');
	});
});
