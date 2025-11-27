import { NextRequest } from 'next/server';
import { POST as addAssignment } from '@/app/api/work-orders/[id]/assignments/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('POST /api/work-orders/[id]/assignments', () => {
	const validUserId = '123e4567-e89b-12d3-a456-426614174005';
	const validWorkOrderId = '123e4567-e89b-12d3-a456-426614174010';
	const validOrgId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: '123e4567-e89b-12d3-a456-426614174004' },
			membership: { org_id: validOrgId, role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should add assignment to work order', async () => {
		const workOrder = {
			id: validWorkOrderId,
			organization_id: validOrgId,
		};

		const assignment = {
			id: '123e4567-e89b-12d3-a456-426614174011',
			work_order_id: validWorkOrderId,
			user_id: validUserId,
			role: 'Worker',
			is_responsible: true,
			assignment_status: 'TILLDELAD',
			user: {
				id: validUserId,
				full_name: 'Test User',
				email: 'test@example.com',
			},
		};

		const checkBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: workOrder,
				error: null,
			}),
		};

		const existingCheckBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' },
			}),
		};

		const insertBuilder: any = {
			insert: jest.fn(function(data: any) {
				insertBuilder._insertData = data;
				return insertBuilder;
			}),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: assignment,
				error: null,
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: (table: string) => {
				if (table === 'work_orders') {
					return { select: () => checkBuilder };
				}
				if (table === 'work_order_assignments') {
					return {
						select: () => existingCheckBuilder,
						insert: (data: any) => insertBuilder.insert(data),
					};
				}
				return {};
			},
		} as any);

		const request = new NextRequest(`http://localhost/api/work-orders/${validWorkOrderId}/assignments`, {
			method: 'POST',
			body: JSON.stringify({
				user_id: validUserId,
				role: 'Worker',
			}),
		});

		const response = await addAssignment(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(201);
		expect(payload.assignment.id).toBe('123e4567-e89b-12d3-a456-426614174011');
		expect(payload.assignment.user_id).toBe(validUserId);
	});

	it('should require admin or foreman role', async () => {
		mockedGetSession.mockResolvedValueOnce({
			user: { id: '123e4567-e89b-12d3-a456-426614174004' },
			membership: { org_id: validOrgId, role: 'worker' },
		} as any);

		const request = new NextRequest(`http://localhost/api/work-orders/${validWorkOrderId}/assignments`, {
			method: 'POST',
			body: JSON.stringify({ user_id: validUserId }),
		});

		const response = await addAssignment(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(403);
		expect(payload.error).toBe('Insufficient permissions');
	});

	it('should return 401 if not authenticated', async () => {
		mockedGetSession.mockResolvedValueOnce({
			user: null,
			membership: null,
		} as any);

		const request = new NextRequest(`http://localhost/api/work-orders/${validWorkOrderId}/assignments`, {
			method: 'POST',
			body: JSON.stringify({ user_id: validUserId }),
		});

		const response = await addAssignment(request, {
			params: Promise.resolve({ id: validWorkOrderId }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(401);
		expect(payload.error).toBe('Unauthorized');
	});

	it('should return 404 if work order not found', async () => {
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

		const request = new NextRequest(`http://localhost/api/work-orders/non-existent/assignments`, {
			method: 'POST',
			body: JSON.stringify({ user_id: validUserId }),
		});

		const response = await addAssignment(request, {
			params: Promise.resolve({ id: 'non-existent' }),
		} as any);
		const payload = await response.json();

		expect(response.status).toBe(404);
		expect(payload.error).toBe('Work order not found');
	});
});
